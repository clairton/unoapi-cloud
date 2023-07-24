/* eslint-disable @typescript-eslint/no-unused-vars */
import { AnyMessageContent, WAMessage, delay } from '@whiskeysockets/baileys'
import { Outgoing } from './outgoing'
import { Store, stores } from './store'
import { dataStores } from './data_store'
import { mediaStores } from './media_store'
import { connect, Status, SendError, sendMessage, readMessages, rejectCall, OnQrCode, OnStatus, OnNewLogin } from './socket'
import { Client, getClient } from './client'
import { Config, defaultConfig, getConfig } from './config'
import { toBaileysMessageContent, phoneNumberToJid, jidToPhoneNumber } from './transformer'
import { v1 as uuid } from 'uuid'
import { Response } from './response'
import { Incoming } from './incoming'
import QRCode from 'qrcode'
import { Template } from './template'
import logger from './logger'
const attempts = 3

const clients: Map<string, Client> = new Map()
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
    logger.info('Connecting client baileys %s', phone)
    await client.connect()
    logger.info('Created and connected client baileys %s', phone)
    clients.set(phone, client)
  } else {
    logger.debug('Retrieving client baileys %s', phone)
  }
  return clients.get(phone) as Client
}

const sendError = new SendError(3, 'disconnect number, please read qr code')

const statusDefault: Status = { connected: false, disconnected: true, connecting: false, attempt: 0, reconnecting: false }

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

export class ClientBaileys implements Client {
  private phone: string
  private config: Config = defaultConfig
  private status: Status = statusDefault
  private sendMessage = sendMessageDefault
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
      logger.debug('onStatus', JSON.stringify(payload))

      try {
        const response = await this.outgoing.sendOne(this.phone, payload)
        return response
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } catch (error: any) {
        await this.onWebhookError(error)
      }
    }
  }

  private onQrCode: OnQrCode = async (qrCode: string, time, limit) => {
    logger.debug('Received qrcode', this.phone, qrCode)
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
    await this.store?.dataStore?.setKey(id, waMessageKey)
    try {
      await this.outgoing.sendOne(this.phone, waMessage)
    } catch (error) {
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
    } catch (error) {
      await this.onWebhookError(error)
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
    this.outgoing = outgoing
    this.incoming = incoming
    this.getConfig = getConfig
    this.onNewLogin = onNewLogin
  }

  async connect() {
    this.config = await this.getConfig(this.phone)
    this.store = await this.config.getStore(this.phone, this.config)
    const { status, send, read, event, rejectCall } = await connect({
      phone: this.phone,
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      store: this.store!,
      attempts,
      onQrCode: this.onQrCode,
      onStatus: this.onStatus,
      onNewLogin: this.onNewLogin,
      config: this.config,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      onDisconnected: async (_phone: string, _payload: any) => this.disconnect(),
      onReconnect: this.onReconnect,
    })
    this.status = status
    this.sendMessage = send
    this.readMessages = read
    this.rejectCall = rejectCall
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    event('messages.upsert', async (payload: any) => {
      logger.debug('messages.upsert', this.phone, JSON.stringify(payload, null, ' '))
      if (payload.type === 'notify') {
        this.listener(payload.messages, false)
      } else if (payload.type === 'append' && !this.config.ignoreOwnMessages) {
        // filter self message send with this sessio to not send same message many times
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const ms = payload.messages.filter((m: any) => !['PENDING', 1, '1'].includes(m.status))
        if (ms.length > 0) {
          this.listener(ms, false)
        } else {
          logger.debug('ignore messages.upsert type append with status pending')
        }
      } else {
        logger.error('Unknown type: ', payload.type)
      }
    })
    event('messages.update', (messages: object[]) => {
      logger.debug('messages.update', this.phone, JSON.stringify(messages, null, ' '))
      this.listener(messages)
    })
    event('message-receipt.update', (messages: object[]) => {
      logger.debug('message-receipt.update', this.phone, JSON.stringify(messages, null, ' '))
      this.listener(messages)
    })
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    event('messages.delete', (update: any) => {
      logger.debug('messages.delete', this.phone, JSON.stringify(update, null, ' '))
      const keys = update.keys || []
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const payload = keys.map((key: any) => {
        return { key, update: { status: 'DELETED' } }
      })
      this.listener(payload)
    })

    if (!this.config.ignoreHistoryMessages) {
      logger.info('Config import history messages', this.phone)
      event('messaging-history.set', async ({ messages, isLatest }: { messages: WAMessage[]; isLatest: boolean }) => {
        logger.info('Importing history messages, is latest', isLatest, this.phone)
        this.listener(messages, false)
      })
    }
    if (this.config.rejectCalls) {
      logger.info('Config to reject calls', this.phone, this.config.rejectCalls)
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
                await this.onWebhookError(error)
              }
            }
            setTimeout(() => {
              logger.debug('Clean call rejecteds', from)
              this.calls.delete(from)
            }, 10_000)
          }
        }
      })
    }
  }

  async disconnect() {
    logger.debug('Clean client, store for', this.phone)
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
              logger.debug('key %s for %s', key, payload?.message_id)
              if (key) {
                logger.debug('Baileys reading message key %s...', key)
                await this.readMessages([key])
                logger.debug('Baileys read message key %s!', key)
              }
            } else {
              logger.debug('Baileys already read message id %s!', payload?.message_id)
            }
          }
          this.store?.dataStore?.setStatus(payload?.message_id, status)
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
          logger.debug('Send to baileys', to, content)
          // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
          const sockDelays = delays.get(this.phone) || (delays.set(this.phone, new Map<string, Delay>()) && delays.get(this.phone)!)
          // eslint-disable-next-line @typescript-eslint/no-unused-vars
          const toDelay = sockDelays.get(to) || (async (_phone: string, to) => sockDelays.set(to, this.delayBeforeSecondMessage))
          await toDelay(this.phone, to)
          const response = await this.sendMessage(to, content, { composing: this.config.composingMessage, ...options })
          if (response) {
            logger.debug('Sent to baileys', response)
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

  getStatus(): Status {
    return this.status
  }
}
