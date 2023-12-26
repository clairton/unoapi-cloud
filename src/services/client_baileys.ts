import { AnyMessageContent, GroupMetadata, WAMessage, delay } from '@whiskeysockets/baileys'
import { Outgoing } from './outgoing'
import { Store, stores } from './store'
import { dataStores } from './data_store'
import { mediaStores } from './media_store'
import {
  connect,
  Status,
  SendError,
  sendMessage,
  readMessages,
  rejectCall,
  OnQrCode,
  OnStatus,
  OnNewLogin,
  fetchImageUrl,
  fetchGroupMetadata,
  Info,
  exists,
} from './socket'
import { Client, getClient } from './client'
import { Config, defaultConfig, getConfig } from './config'
import { toBaileysMessageContent, phoneNumberToJid, jidToPhoneNumber, DecryptError, isIndividualJid } from './transformer'
import { v1 as uuid } from 'uuid'
import { Response } from './response'
import { Incoming } from './incoming'
import QRCode from 'qrcode'
import { Template } from './template'
import logger from './logger'
import { FailedSend } from './outgoing_cloud_api'
const attempts = 3

export const clients: Map<string, Client> = new Map()

interface Delay {
  (phone: string, to: string): Promise<void>
}

const delays: Map<string, Map<string, Delay>> = new Map()

export const getClientBaileys: getClient = async ({
  phone,
  incoming,
  outgoing,
  getConfig,
  onNewLogin,
}: {
  phone: string
  incoming: Incoming
  outgoing: Outgoing
  getConfig: getConfig
  onNewLogin: OnNewLogin
}): Promise<Client> => {
  if (!clients.has(phone)) {
    logger.info('Creating client baileys %s', phone)
    const client = new ClientBaileys(phone, incoming, outgoing, getConfig, onNewLogin)
    const config = await getConfig(phone)
    if (config.autoConnect) {
      logger.info('Connecting client baileys %s', phone)
      await client.connect()
      logger.info('Created and connected client baileys %s', phone)
    } else {
      logger.info('Config client baileys to not auto connect %s', phone)
    }
    clients.set(phone, client)
  } else {
    logger.debug('Retrieving client baileys %s', phone)
  }
  return clients.get(phone) as Client
}

const sendError = new SendError(3, 'disconnect number, please read qr code')

const statusDefault: Status = { connected: false, disconnected: true, connecting: false, attempt: 0, reconnecting: false }
const infoDefault: Info = { phone: '' }

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const sendMessageDefault: sendMessage = async (_phone, _message) => {
  throw sendError
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const readMessagesDefault: readMessages = async (_keys) => {
  throw sendError
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const rejectCallDefault: rejectCall = async (_keys) => {
  throw sendError
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const fetchImageUrlDefault: fetchImageUrl = async (_jid: string) => {
  throw sendError
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const fetchGroupMetadataDefault: fetchGroupMetadata = async (_jid: string) => {
  throw sendError
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const existsDefault: exists = async (_jid: string) => {
  throw sendError
}

export class ClientBaileys implements Client {
  private phone: string
  private config: Config = defaultConfig
  private status: Status = statusDefault
  private info: Info = infoDefault
  private sendMessage = sendMessageDefault
  private fetchImageUrl = fetchImageUrlDefault
  private exists = existsDefault
  private fetchGroupMetadata = fetchGroupMetadataDefault
  private readMessages = readMessagesDefault
  private rejectCall: rejectCall | undefined = rejectCallDefault
  private outgoing: Outgoing
  private incoming: Incoming
  private store: Store | undefined
  private calls = new Map<string, boolean>()
  private getConfig: getConfig
  private onNewLogin

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private onWebhookError = async (error: any) => {
    if (!this.config.throwWebhookError && error.name === 'FetchError' && this.status.connected) {
      return this.incoming.send(
        this.phone,
        { to: this.phone, type: 'text', text: { body: `Error on send message to webhook: ${error.message}` } },
        {},
      )
    }
    if (this.config.throwWebhookError) {
      throw error
    }
  }

  private onStatus: OnStatus = async (text: string, important) => {
    if (this.config.sendConnectionStatus || important) {
      const payload = {
        key: {
          fromMe: true,
          remoteJid: phoneNumberToJid(this.phone),
          id: uuid(),
        },
        message: {
          conversation: text,
        },
        messageTimestamp: new Date().getTime(),
      }
      logger.debug('onStatus %s', JSON.stringify(payload))
      try {
        if (this.config.sessionWebhook) {
          const body = JSON.stringify({ info: this.info, status: this.status, ...payload })
          const response = await fetch(this.config.sessionWebhook, {
            method: 'POST',
            body: body,
            headers: { 'Content-Type': 'application/json' },
          })
          logger.debug('Response OnStatus Webhook Session', response)
        } else {
          const response = await this.outgoing.sendOne(this.phone, payload)
          return response
        }
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } catch (error: any) {
        logger.error(error, 'Erro on send status')
        await this.onWebhookError(error)
      }
    }
  }

  private onQrCode: OnQrCode = async (qrCode: string, time, limit) => {
    logger.debug('Received qrcode %s %s', this.phone, qrCode)
    const messageTimestamp = new Date().getTime()
    const id = uuid()
    const qrCodeUrl = await QRCode.toDataURL(qrCode)
    const remoteJid = phoneNumberToJid(this.phone)
    const waMessageKey = {
      fromMe: true,
      remoteJid,
      id,
    }
    const waMessage: WAMessage = {
      key: waMessageKey,
      message: {
        imageMessage: {
          url: qrCodeUrl,
          mimetype: 'image/png',
          fileLength: qrCode.length,
          caption: `Please, read the QR Code to connect on Whatsapp Web, attempt ${time} of ${limit}`,
        },
      },
      messageTimestamp,
    }
    try {
      if (this.config.sessionWebhook) {
        const body = JSON.stringify({ info: this.info, status: this.status, ...waMessage })
        const response = await fetch(this.config.sessionWebhook, {
          method: 'POST',
          body: body,
          headers: { 'Content-Type': 'application/json' },
        })
        logger.debug('Response Webhook Session', response)
      } else {
        await this.store?.dataStore?.setKey(id, waMessageKey)
        await this.outgoing.sendOne(this.phone, waMessage)
      }
    } catch (error) {
      logger.error(error, 'Erro on send qrcode')
      await this.onWebhookError(error)
    }
  }

  private onReconnect = async () => {
    await this.disconnect()
    await getClientBaileys({
      phone: this.phone,
      incoming: this.incoming,
      outgoing: this.outgoing,
      getConfig: this.getConfig,
      onNewLogin: this.onNewLogin,
    })
  }

  private listener = async (messages: object[], update = true) => {
    logger.debug('Received %s %s', update ? 'update(s)' : 'message(s)', messages.length, this.phone)
    try {
      const resp = await this.outgoing.sendMany(this.phone, messages)
      return resp
    } catch (e) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const others: any[] = []
      if (e instanceof FailedSend) {
        const errors = e.getErrors()
        for (let i = errors.length; i < errors.length; i++) {
          const error = errors[i]
          if (error instanceof DecryptError) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const message = (error.getContent() as any)?.entry[0]?.changes[0]?.value?.messages[0]
            if (message.id) {
              const payload = {
                messaging_product: 'whatsapp',
                context: {
                  message_id: message.id,
                },
                to: message.to,
                type: 'text',
                text: {
                  body: '.',
                },
              }
              await this.incoming.send(this.phone, payload, {})
              await this.outgoing.send(this.phone, error.getContent())
            }
          } else {
            others.push(error)
          }
        }
      }
      if (others.length) {
        await this.onWebhookError(e)
      }
    }
  }

  private delayBeforeSecondMessage: Delay = async (phone, to) => {
    const time = 2000
    logger.debug(`Sleep for ${time} before second message ${phone} => ${to}`)
    delays && (delays.get(phone) || new Map()).set(to, this.continueAfterSecondMessage)
    return delay(time)
  }

  // eslint-disable-next-line @typescript-eslint/no-empty-function, @typescript-eslint/no-unused-vars
  private continueAfterSecondMessage: Delay = async (_phone, _to) => {}

  constructor(phone: string, incoming: Incoming, outgoing: Outgoing, getConfig: getConfig, onNewLogin: OnNewLogin) {
    this.phone = phone
    this.info.phone = phone

    this.outgoing = outgoing
    this.incoming = incoming
    this.getConfig = getConfig
    this.onNewLogin = onNewLogin
  }

  async connect() {
    this.config = await this.getConfig(this.phone)
    if (!this.config.ignoreGroupMessages) {
      logger.debug('Override config.getMessageMetadata')
      this.config.getMessageMetadata = async <T>(data: T) => {
        logger.debug(data, 'Put metadata in message')
        return this.getMessageMetadata(data)
      }
    }
    this.store = await this.config.getStore(this.phone, this.config)
    const { status, send, read, event, rejectCall, fetchImageUrl, fetchGroupMetadata, exists } = await connect({
      phone: this.phone,
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      store: this.store!,
      attempts,
      onQrCode: this.onQrCode,
      onStatus: this.onStatus,
      onNewLogin: this.onNewLogin,
      config: this.config,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars
      onDisconnected: async (_phone: string, _payload: any) => this.disconnect(),
      onReconnect: this.onReconnect,
    })
    this.status = status
    this.sendMessage = send
    this.readMessages = read
    this.rejectCall = rejectCall
    this.fetchImageUrl = fetchImageUrl
    this.fetchGroupMetadata = fetchGroupMetadata
    this.exists = exists
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    event('messages.upsert', async (payload: any) => {
      logger.debug('messages.upsert %s', this.phone, JSON.stringify(payload))
      if (payload.type === 'notify') {
        this.listener(payload.messages, false)
      } else if (payload.type === 'append' && !this.config.ignoreOwnMessages) {
        // filter self message send with this session to not send same message many times
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const ms = payload.messages.filter((m: any) => !['PENDING', 1, '1'].includes(m.status))
        if (ms.length > 0) {
          this.listener(ms, false)
        } else {
          logger.debug('ignore messages.upsert type append with status pending')
        }
      } else {
        logger.error('Unknown type: %s', payload.type)
      }
    })
    event('messages.update', (messages: object[]) => {
      logger.debug('messages.update %s %s', this.phone, JSON.stringify(messages))
      this.listener(messages)
    })
    event('message-receipt.update', (messages: object[]) => {
      logger.debug('message-receipt.update %s %s', this.phone, JSON.stringify(messages))
      this.listener(messages)
    })
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    event('messages.delete', (update: any) => {
      logger.debug('messages.delete %s', this.phone, JSON.stringify(update))
      const keys = update.keys || []
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const payload = keys.map((key: any) => {
        return { key, update: { status: 'DELETED' } }
      })
      this.listener(payload)
    })

    if (!this.config.ignoreHistoryMessages) {
      logger.info('Config import history messages %', this.phone)
      event('messaging-history.set', async ({ messages, isLatest }: { messages: WAMessage[]; isLatest: boolean }) => {
        logger.info('Importing history messages, is latest %s %s', isLatest, this.phone)
        this.listener(messages, false)
      })
    }
    if (this.config.rejectCalls) {
      logger.info('Config to reject calls %s %s', this.phone, this.config.rejectCalls)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      event('call', async (events: any[]) => {
        for (let i = 0; i < events.length; i++) {
          const { from, id, status } = events[i]
          if (status == 'ringing' && !this.calls.has(from)) {
            this.calls.set(from, true)
            this.rejectCall && (await this.rejectCall(id, from))
            await this.incoming.send(this.phone, { to: from, type: 'text', text: { body: this.config.rejectCalls } }, {})
            if (this.config.rejectCallsWebhook) {
              const message = {
                key: {
                  fromMe: false,
                  id: uuid(),
                  remoteJid: from,
                },
                message: {
                  conversation: this.config.rejectCallsWebhook,
                },
              }
              try {
                await this.outgoing.sendOne(this.phone, message)
              } catch (error) {
                logger.error(error, 'Erro on reject call')
                await this.onWebhookError(error)
              }
            }
            setTimeout(() => {
              logger.debug('Clean call rejecteds %s', from)
              this.calls.delete(from)
            }, 10_000)
          }
        }
      })
    }
  }

  async disconnect() {
    logger.debug('Clean client, store for %s', this.phone)
    this.store = undefined
    // clean cache
    clients.delete(this.phone)
    stores.delete(this.phone)
    dataStores.delete(this.phone)
    mediaStores.delete(this.phone)
    this.status = statusDefault
    this.sendMessage = sendMessageDefault
    this.readMessages = readMessagesDefault
    this.rejectCall = rejectCallDefault
    this.fetchImageUrl = fetchImageUrlDefault
    this.fetchGroupMetadata = fetchGroupMetadataDefault
    this.exists = existsDefault
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async send(payload: any, options: any = {}) {
    const { status, type, to } = payload
    try {
      if (status) {
        if (['sent', 'delivered', 'failed', 'progress', 'read'].includes(status)) {
          if (status == 'read') {
            const currentStatus = await this.store?.dataStore?.loadStatus(payload?.message_id)
            if (currentStatus != status) {
              const key = await this.store?.dataStore?.loadKey(payload?.message_id)
              logger.debug('key %s for %s', JSON.stringify(key), payload?.message_id)
              if (key) {
                logger.debug('Baileys reading message key %s...', JSON.stringify(key))
                await this.readMessages([key])
                logger.debug('Baileys read message key %s!', JSON.stringify(key))
              }
            } else {
              logger.debug('Baileys already read message id %s!', payload?.message_id)
            }
          }
          await this.store?.dataStore?.setStatus(payload?.message_id, status)
          const r: Response = { ok: { success: true } }
          return r
        } else {
          throw new Error(`Unknow message status ${status}`)
        }
      } else if (type) {
        if (['text', 'image', 'audio', 'document', 'video', 'template'].includes(type)) {
          let content: AnyMessageContent
          if ('template' === type) {
            const template = new Template(this.getConfig)
            content = await template.bind(this.phone, payload.template.name, payload.template.components)
          } else {
            content = toBaileysMessageContent(payload)
          }
          let quoted: WAMessage | undefined = undefined
          const messageId = payload?.context?.message_id || payload?.context?.id
          if (messageId) {
            const key = await this.store?.dataStore?.loadKey(messageId)
            logger.debug('Quoted message key %s!', key?.id)
            if (key?.id) {
              const remoteJid = phoneNumberToJid(to)
              quoted = await this.store?.dataStore.loadMessage(remoteJid, key?.id)
              if (!quoted) {
                const unoId = await this.store?.dataStore?.loadUnoId(key?.id)
                if (unoId) {
                  quoted = await this.store?.dataStore.loadMessage(remoteJid, unoId)
                }
              }
              logger.debug('Quoted message %s!', JSON.stringify(quoted))
            }
          }
          logger.debug('Send to baileys', to, content)
          // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
          const sockDelays = delays.get(this.phone) || (delays.set(this.phone, new Map<string, Delay>()) && delays.get(this.phone)!)
          // eslint-disable-next-line @typescript-eslint/no-unused-vars
          const toDelay = sockDelays.get(to) || (async (_phone: string, to) => sockDelays.set(to, this.delayBeforeSecondMessage))
          await toDelay(this.phone, to)
          const response = await this.sendMessage(to, content, { composing: this.config.composingMessage, quoted, ...options })
          if (response) {
            logger.debug('Sent to baileys %s', JSON.stringify(response))
            const key = response.key
            const ok = {
              messaging_product: 'whatsapp',
              contacts: [
                {
                  wa_id: jidToPhoneNumber(to, ''),
                },
              ],
              messages: [
                {
                  id: key.id,
                },
              ],
            }
            const r: Response = { ok }
            return r
          } else {
            logger.error('Response on sent to baileys is empty.....')
            throw new SendError(5, 'Wait a moment, connecting process')
          }
        } else {
          throw new Error(`Unknow message type ${type}`)
        }
      }
    } catch (e) {
      if (e instanceof SendError) {
        const code = e.code
        const title = e.title
        await this.onStatus(title, true)
        if ([3, '3'].includes(code)) {
          this.connect()
        }
        const id = uuid()
        const ok = {
          messaging_product: 'whatsapp',
          contacts: [
            {
              wa_id: jidToPhoneNumber(to, ''),
            },
          ],
          messages: [
            {
              id,
            },
          ],
        }
        const error = {
          object: 'whatsapp_business_account',
          entry: [
            {
              id: this.phone,
              changes: [
                {
                  value: {
                    messaging_product: 'whatsapp',
                    metadata: {
                      display_phone_number: this.phone,
                      phone_number_id: this.phone,
                    },
                    statuses: [
                      {
                        id,
                        recipient_id: jidToPhoneNumber(to, ''),
                        status: 'failed',
                        timestamp: Math.floor(Date.now() / 1000),
                        errors: [
                          {
                            code,
                            title,
                          },
                        ],
                      },
                    ],
                  },
                  field: 'messages',
                },
              ],
            },
          ],
        }
        const r: Response = { ok, error }
        return r
      } else {
        throw e
      }
    }
    throw new Error(`Unknow message type ${JSON.stringify(payload)}`)
  }

  async getMessageMetadata<T>(message: T) {
    if (!this.status.connected) {
      return message
    }
    const key = message && message['key']
    let remoteJid
    if (key.remoteJid && !isIndividualJid(key.remoteJid)) {
      logger.debug(`Retrieving group metadata...`)
      remoteJid = key.participant
      let groupMetadata: GroupMetadata | undefined = await this.fetchGroupMetadata(key.remoteJid)
      if (groupMetadata) {
        logger.debug(groupMetadata, 'Retrieved group metadata!')
      } else {
        groupMetadata = {
          id: key.remoteJid,
          owner: '',
          subject: key.remoteJid,
          participants: [],
        }
      }
      message['groupMetadata'] = groupMetadata
      logger.debug(`Retrieving group profile picture...`)
      try {
        groupMetadata['profilePicture'] = await this.fetchImageUrl(key.remoteJid)
      } catch (error) {
        logger.error(error, 'Error on retrieve group profile picture')
      }
    } else {
      remoteJid = key.remoteJid
    }
    if (remoteJid) {
      const jid = await this.exists(remoteJid)
      if (jid) {
        try {
          logger.debug(`Retrieving user picture...`)
          message['profilePicture'] = await this.fetchImageUrl(jid)
        } catch (error) {
          logger.error(error, 'Error on retrieve user profile picture')
        }
      }
    }
    return message
  }

  getStatus(): Status {
    return this.status
  }

  getInfo(): Info {
    return this.info
  }
}
