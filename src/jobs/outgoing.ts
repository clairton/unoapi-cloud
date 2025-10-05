import { Webhook } from '../services/config'
import { Outgoing } from '../services/outgoing'
import { amqpPublish } from '../amqp'
import {
  STATUS_FAILED_WEBHOOK_URL,
  UNOAPI_DELAY_AFTER_FIRST_MESSAGE_WEBHOOK_MS,
  UNOAPI_EXCHANGE_BROKER_NAME,
  UNOAPI_QUEUE_OUTGOING,
  UNOAPI_QUEUE_TRANSCRIBER,
  UNOAPI_QUEUE_WEBHOOK_STATUS_FAILED
} from '../defaults'
import { extractDestinyPhone, isAudioMessage, isIncomingMessage, jidToPhoneNumber, TYPE_MESSAGES_MEDIA } from '../services/transformer'
import { downloadContentFromMessage } from 'baileys'
import mime from 'mime-types'
import logger from '../services/logger'
import { getConfig } from '../services/config'
import { isUpdateMessage, isFailedStatus } from '../services/transformer'

const  dUntil: Map<string, number> = new Map()
const  dVerified: Map<string, boolean> = new Map()

const sleep = (ms) => {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

const delayFunc = UNOAPI_DELAY_AFTER_FIRST_MESSAGE_WEBHOOK_MS ? async (phone, payload) => {
  const to = extractDestinyPhone(payload, false)
 
  if (to) {
    const key = `${phone}:${to}`
    if (!dVerified.get(key)) {
      let nextMessageTime = dUntil.get(key)
      const epochMS: number = Math.floor(Date.now());
      if (nextMessageTime === undefined) {
        nextMessageTime = epochMS + UNOAPI_DELAY_AFTER_FIRST_MESSAGE_WEBHOOK_MS
        dUntil.set(key, nextMessageTime);
        logger.debug('Key %s First message', key)
      } else {
        const thisMessageDelay: number = Math.floor(nextMessageTime - epochMS)
        if (thisMessageDelay > 0) {
          logger.debug('Key %s Message delayed by %s ms', key, thisMessageDelay)
          await sleep(thisMessageDelay)
        } else {
          logger.debug('Key %s doesn\'t need more delays', key)
          dVerified.set(key, true);
          dUntil.delete(key);
        }
      } 
    }
  }
} :  async (_phone, _payload) => {}

export class OutgoingJob {
  private service: Outgoing
  private getConfig: getConfig

  constructor(getConfig: getConfig, service: Outgoing) {
    this.service = service
    this.getConfig = getConfig
  }

  async consume(phone: string, data: object) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const a = { ...data as any }
    const payload: any = a.payload
    // Provider adapters (e.g., Whatsmeow) can publish only { payload }
    // to let UnoAPI fan-out to configured webhooks. In this case,
    // re-enqueue one message per webhook to reuse the single-webhook path
    // below (which applies provider-specific transforms when needed).
    if (!a.webhooks && !a.webhook && payload) {
      const config = await this.getConfig(phone)
      await Promise.all(
        config.webhooks.map(async (webhook) =>
          amqpPublish(UNOAPI_EXCHANGE_BROKER_NAME, UNOAPI_QUEUE_OUTGOING, phone, { payload, webhook }, { type: 'topic' }),
        ),
      )
      return
    }
    if (a.webhooks) {
      const webhooks: Webhook[] = a.webhooks
      if (isFailedStatus(payload) && STATUS_FAILED_WEBHOOK_URL) {
        await amqpPublish(
          UNOAPI_EXCHANGE_BROKER_NAME,
          UNOAPI_QUEUE_WEBHOOK_STATUS_FAILED,
          phone,
          { payload }, 
          { type: 'topic' }
        )
      }
      await Promise.all(
        webhooks.map(async (webhook) => {
          return amqpPublish(UNOAPI_EXCHANGE_BROKER_NAME,  UNOAPI_QUEUE_OUTGOING, phone, { payload, webhook })
        }),
      )
      if (isAudioMessage(payload)) {
        const webhooks = a.webhooks.filter(w => {
          if (w.sendTranscribeAudio) {
            logger.debug('Session phone %s webhook %s configured to send transcribe audio message for this webhook', phone, w.id)
            return true
          }
        })
        if (webhooks.length > 0) {
          await amqpPublish(UNOAPI_EXCHANGE_BROKER_NAME,  UNOAPI_QUEUE_TRANSCRIBER, phone, { payload, webhooks }, { type: 'topic' })
        }
      }
    } else if (a.webhook) {
      await delayFunc(phone, payload)
      const config = await this.getConfig(phone)
      if (config.provider == 'forwarder') {
        const store = await config.getStore(phone, config)
        payload.entry[0].changes[0].value.metadata.phone_number_id = phone
        const { dataStore } = store
        if (isUpdateMessage(payload)) {
          payload.entry[0].changes[0].value.statuses = await Promise.all(
            payload.entry[0].changes[0].value.statuses.map(async status => {
              const currentId = status.id
              const unoId = await dataStore.loadUnoId(currentId)
              if (unoId) {
                status.id = unoId
              }
              return status
            })
          )
        } else {
          payload.entry[0].changes[0].value.contacts = await Promise.all(
            payload.entry[0].changes[0].value.contacts.map(async contact => {
              contact.wa_id = jidToPhoneNumber(contact.wa_id, '')
              return contact
            })
          )
          const isIncoming = isIncomingMessage(payload)
          payload.entry[0].changes[0].value.messages = await Promise.all(
            payload.entry[0].changes[0].value.messages.map(async message => {
              if (TYPE_MESSAGES_MEDIA.includes(message.type) && isIncoming) {
                const { mediaStore } = store
                message = await mediaStore.saveMediaForwarder(message)
              }
              if (message.context && message.context.id) {
                const unoId = await dataStore.loadUnoId(message.context.id)
                if (unoId) {
                  message.context.id = unoId
                }
              }
              if (message.reaction && message.reaction.message_id) {
                const unoId = await dataStore.loadUnoId(message.reaction.message_id)
                if (unoId) {
                  message.reaction.id = unoId
                }
              }
              message.from = jidToPhoneNumber(message.from, '')
              return message
            })
          )
        }
      } else if (config.provider == 'whatsmeow') {
        // Handle media using Baileys download/decrypt when payload comes with
        // directPath/mediaKey (camelCase or snake_case), regardless of direction.
        const store = await config.getStore(phone, config)
        const { dataStore, mediaStore } = store
        if (!isUpdateMessage(payload)) {
          payload.entry[0].changes[0].value.messages = await Promise.all(
            payload.entry[0].changes[0].value.messages.map(async message => {
              if (TYPE_MESSAGES_MEDIA.includes(message.type)) {
                const media = message[message.type] || {}
                // Try both camelCase and snake_case keys
                let mediaKey = media.mediaKey || media.media_key
                const directPath = media.directPath || media.direct_path
                const url = media.url || (directPath ? `https://mmg.whatsapp.net${directPath}` : undefined)
                if (!mediaKey || (!directPath && !url)) {
                  return message
                }
                if (typeof mediaKey === 'string') {
                  // assume base64
                  try {
                    mediaKey = Buffer.from(mediaKey, 'base64')
                  } catch (_) { /* ignore conversion errors */ }
                } else if (typeof mediaKey === 'object' && mediaKey !== null) {
                  try {
                    mediaKey = Uint8Array.from(Object.values(mediaKey))
                  } catch (_) { /* ignore conversion errors */ }
                }
                const mapMediaType = {
                  image: 'image',
                  video: 'video',
                  document: 'document',
                  sticker: 'sticker',
                  audio: 'audio',
                } as const
                try {
                  const stream = await downloadContentFromMessage(
                    {
                      mediaKey,
                      directPath,
                      url,
                    } as any,
                    mapMediaType[message.type],
                    {},
                  )
                  const chunks: Buffer[] = []
                  for await (const chunk of stream) {
                    chunks.push(chunk as Buffer)
                  }
                  const buffer = Buffer.concat(chunks)
                  const mimetype: string = media.mime_type || media.mimetype || (media.filename ? (mime.lookup(media.filename) as string) : 'application/octet-stream')
                  const filePath = mediaStore.getFilePath(phone, message.id, mimetype)
                  await mediaStore.saveMediaBuffer(filePath, buffer)
                  const mediaId = `${phone}/${message.id}`
                  const payloadMedia = {
                    messaging_product: 'whatsapp',
                    mime_type: mimetype,
                    sha256: media.fileSha256 || media.sha256,
                    file_size: media.fileLength || media.file_size,
                    id: mediaId,
                    filename: media.filename || filePath,
                  }
                  await dataStore.setMediaPayload(message.id, payloadMedia)
                  message[message.type].id = mediaId
                } catch (err) {
                  // If download/decrypt fails, leave message as-is
                }
              }
              // Preserve digits-only Cloud payloads from adapters (e.g., whatsmeow)
              // to avoid BR-specific normalization that inserts a '9' and
              // breaks alignment with contacts[0].wa_id used by Chatwoot.
              if (!/^\d+$/.test(message.from)) {
                message.from = jidToPhoneNumber(message.from, '')
              }
              return message
            })
          )
        }
      }
      // If this is a status/receipt payload, optionally delay to ensure
      // related media messages are delivered first to the webhook consumer.
      await sleep(1000)
      await this.service.sendHttp(phone, a.webhook, payload, {})
    }
  }
}
