import { Incoming } from '../services/incoming'
import { Outgoing } from '../services/outgoing'
import { UNOAPI_JOB_COMMANDER, UNOAPI_JOB_BULK_STATUS, FETCH_TIMEOUT_MS, UNOAPI_SERVER_NAME } from '../defaults'
import { PublishOption, amqpPublish } from '../amqp'
import { getConfig } from '../services/config'
import { jidToPhoneNumber, getMimetype, toBuffer } from '../services/transformer'
import logger from '../services/logger'
import fetch, { Response } from 'node-fetch'
import mime from 'mime-types'
import { v1 as uuid } from 'uuid'

export class IncomingJob {
  private incoming: Incoming
  private outgoing: Outgoing
  private getConfig: getConfig
  private queueCommander: string

  constructor(incoming: Incoming, outgoing: Outgoing, getConfig: getConfig, queueCommander = UNOAPI_JOB_COMMANDER) {
    this.incoming = incoming
    this.outgoing = outgoing
    this.getConfig = getConfig
    this.queueCommander = queueCommander
  }

  async consume(phone: string, data: object) {
    const config = await this.getConfig(phone)
    if (config.server !== UNOAPI_SERVER_NAME) {
      logger.info(`Ignore incoming with ${phone} server ${config.server} is not server current server ${UNOAPI_SERVER_NAME}...`)
      return;
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const a = data as any
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const payload: any = a.payload
    const options: object = a.options
    const idUno: string = a.id || uuid()
    const waId = jidToPhoneNumber(payload.to, '')
    const timestamp = Math.floor(new Date().getTime() / 1000).toString()
    // const retries: number = a.retries ? a.retries + 1 : 1
    const response = await this.incoming.send(phone, payload, options)
    logger.debug('Baileys response %s -> %s', phone, JSON.stringify(response))
    const channelNumber = phone.replace('+', '')
    logger.debug('Compare to enqueue to commander %s == %s', channelNumber, payload?.to)
    if (channelNumber == payload?.to) {
      logger.debug(`Enqueue in commmander...`)
      await amqpPublish(this.queueCommander, phone, { payload })
    }
    const { ok, error } = response
    const optionsOutgoing: Partial<PublishOption>  = {}
    if (ok && ok.messages && ok.messages[0] && ok.messages[0].id) {
      const idBaileys: string = ok.messages[0].id
      logger.debug('Baileys id %s to Unoapi id %s', idBaileys, idUno)
      const { dataStore } = await config.getStore(phone, config)
      await dataStore.setUnoId(idBaileys, idUno)
      const key = await dataStore.loadKey(idBaileys)
      if (key) {
        dataStore.setKey(idUno, key)
      }
      let messagePayload = payload[payload.type]
      if (['image', 'audio', 'document', 'video'].includes(payload.type)) {
        const { mediaStore } = await config.getStore(phone, config)
        const mediaKey = `${phone}/${idUno}`
        const link = payload[payload.type].link
        const mimetype = getMimetype(payload)
        const extension = mime.extension(mimetype)
        const fileName = `${mediaKey}.${extension}`
        const response: Response = await fetch(link, { signal: AbortSignal.timeout(FETCH_TIMEOUT_MS), method: 'GET'})
        const buffer = toBuffer(await response.arrayBuffer())
        await mediaStore.saveMediaBuffer(fileName, buffer)
        messagePayload = {
          filename: payload[payload.type].filename,
          caption: payload[payload.type].caption,
          id: mediaKey,
          mime_type: mimetype,
        }
        delete messagePayload['link']
      }
      const webhookMessage = {
        object: 'whatsapp_business_account',
        entry: [
          {
            id: phone,
            changes: [
              {
                value: {
                  messaging_product: 'whatsapp',
                  metadata: {
                    display_phone_number: phone,
                    phone_number_id: phone,
                  },
                  contacts: [
                    {
                      wa_id: waId,
                      profile: {
                        name: '',
                        picture: '',
                      },
                    },
                  ],
                  messages: [
                    {
                      from: phone,
                      id: idUno,
                      timestamp,
                      [payload.type]: messagePayload,
                      type: payload.type,
                    },
                  ],
                },
                field: 'messages',
              },
            ],
          },
        ],
      }
      const webhooks = config.webhooks.filter((w) => w.sendNewMessages)
      logger.debug('%s webhooks with sendNewMessages', webhooks.length)
      await Promise.all(webhooks.map((w) => this.outgoing.sendHttp(phone, w, webhookMessage, {})))
    } else if (!ok.success) {
      throw `Unknow response ${JSON.stringify(response)}`
    } else if (ok.success) {
      logger.debug('Message id %s update to status %s', payload?.message_id, payload?.status)
      return
    }
    let outgingPayload
    if (error) {
      if (idUno) {
        error.entry[0].changes[0].value.statuses[0].id = idUno
      }
      outgingPayload = error
      optionsOutgoing.delay = 1000
      optionsOutgoing.priority = 1
      // const status = error.entry[0].changes[0].value.statuses[0]
      // const code = status?.errors[0]?.code
      // retry when error: 5 - Wait a moment, connecting process
      // if (retries < UNOAPI_MESSAGE_RETRY_LIMIT && ['5', 5].includes(code)) {
      //   await amqpPublish(UNOAPI_JOB_INCOMING, phone, { ...data, retries }, options)
      // }
    } else {
      outgingPayload = {
        object: 'whatsapp_business_account',
        entry: [
          {
            id: phone,
            changes: [
              {
                value: {
                  messaging_product: 'whatsapp',
                  metadata: {
                    display_phone_number: phone,
                    phone_number_id: phone,
                  },
                  contacts: [
                    {
                      wa_id: waId,
                      profile: {
                        name: '',
                        picture: '',
                      },
                    },
                  ],
                  statuses: [
                    {
                      id: idUno,
                      recipient_id: payload?.to,
                      status: 'sent',
                      timestamp,
                    },
                  ],
                },
                field: 'messages',
              },
            ],
          },
        ],
      }
    }
    await amqpPublish(UNOAPI_JOB_BULK_STATUS, phone, { payload: outgingPayload, type: 'whatsapp' })
    await Promise.all(config.webhooks.map((w) => this.outgoing.sendHttp(phone, w, outgingPayload, optionsOutgoing)))
    return response
  }
}
