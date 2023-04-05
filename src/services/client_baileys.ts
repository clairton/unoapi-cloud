import { AnyMessageContent, WAMessage, delay } from '@adiwajshing/baileys'
import { Outgoing } from './outgoing'
import { Store, stores } from './store'
import { dataStores } from './data_store'
import { mediaStores } from './media_store'
import { connect, Status, SendError, sendMessage, readMessages, rejectCall } from './socket'
import { Client, getClient } from './client'
import { Config, getConfig } from './config'
import { toBaileysMessageContent, phoneNumberToJid } from './transformer'
import { v1 as uuid } from 'uuid'
import { Response } from './response'
import { Incoming } from './incoming'
import QRCode from 'qrcode'
const attempts = 6
const timeout = 1e3

const clients: Map<string, Client> = new Map()
interface Delay {
  (phone: string, to: string): Promise<void>
}
const delayOnSecondMessage: Delay = async (phone, to) => {
  const time = 2000
  console.debug(`Sleep for ${time} on second message ${phone} => ${to}`)
  return delay(time)
}
// eslint-disable-next-line @typescript-eslint/no-empty-function, @typescript-eslint/no-unused-vars
const continueAfterSecondMessage: Delay = async (phone, to) => {}
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
  onNewLogin: (_phone: string) => void
}): Promise<Client> => {
  if (!clients.has(phone)) {
    console.info('Creating client baileys %s', phone)
    const client = new ClientBaileys(phone, incoming, outgoing, getConfig, onNewLogin)
    await client.connect()
    console.info('Client baileys created and connected %s', phone)
    clients.set(phone, client)
  } else {
    console.debug('Retrieving client baileys %s', phone)
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
  private config: Config
  private status: Status = statusDefault
  private sendMessage = sendMessageDefault
  private readMessages = readMessagesDefault
  private rejectCall = rejectCallDefault
  private outgoing: Outgoing
  private incoming: Incoming
  private store: Store | undefined
  private calls = new Map<string, boolean>()
  private getConfig: getConfig
  private onNewLogin

  private onStatus = (text: string, important) => {
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
      return this.outgoing.sendOne(this.phone, payload)
    }
  }

  private onQrCode = async (qrCode: string, time, limit) => {
    console.debug(`Received qrcode ${qrCode}`)
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
    await this.store.dataStore.setKey(id, waMessageKey)
    await this.outgoing.sendOne(this.phone, waMessage)
  }

  private listener = (messages: object[], update = true) => {
    console.debug('Received %s %s', update ? 'update(s)' : 'message(s)', messages.length, this.phone)
    return this.outgoing.sendMany(this.phone, messages)
  }

  constructor(phone: string, incoming: Incoming, outgoing: Outgoing, getConfig: getConfig, onNewLogin) {
    this.phone = phone
    this.outgoing = outgoing
    this.incoming = incoming
    this.getConfig = getConfig
    this.onNewLogin = onNewLogin
  }

  async connect() {
    this.config = await this.getConfig(this.phone)
    this.store = await this.config.getStore(this.phone, this.config)
    const { status, send, read, ev, rejectCall } = await connect({
      phone: this.phone,
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      store: this.store!,
      attempts,
      timeout,
      onQrCode: this.onQrCode,
      onStatus: this.onStatus,
      onNewLogin: this.onNewLogin,
      config: this.config,
      onDisconnect: async () => this.disconnect(),
    })
    this.status = status
    this.sendMessage = send
    this.readMessages = read
    this.rejectCall = rejectCall
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ev.on('messages.upsert', async (payload: any) => {
      if (payload.type === 'notify') {
        console.debug('messages.upsert', this.phone, JSON.stringify(payload, null, ' '))
        this.listener(payload.messages, false)
      } else {
        console.debug('ignore messages.upsert type append', this.phone, JSON.stringify(payload, null, ' '))
      }
    })
    ev.on('messages.update', (messages: object[]) => {
      console.debug('messages.update', this.phone, JSON.stringify(messages, null, ' '))
      this.listener(messages)
    })
    ev.on('message-receipt.update', (messages: object[]) => {
      console.debug('message-receipt.update', this.phone, JSON.stringify(messages, null, ' '))
      this.listener(messages)
    })
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ev.on('messages.delete', (update: any) => {
      console.debug('messages.delete', this.phone, JSON.stringify(update, null, ' '))
      const keys = update.keys || []
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const payload = keys.map((key: any) => {
        return { key, update: { status: 'DELETED' } }
      })
      this.listener(payload)
    })

    if (!this.config.ignoreHistoryMessages) {
      console.info('Config import history messages', this.phone)
      ev.on('messaging-history.set', async ({ messages, isLatest }: { messages: WAMessage[]; isLatest: boolean }) => {
        console.info('Importing history messages, is latest', isLatest, this.phone)
        this.listener(messages, false)
      })
    }
    if (this.config.rejectCalls) {
      console.info('Config to reject calls', this.phone)
      ev.on('call', async (events) => {
        for (let i = 0; i < events.length; i++) {
          const { from, id, status } = events[i]
          if (status == 'ringing' && !this.calls.has(from)) {
            await this.incoming.send(this.phone, { to: from, type: 'text', text: this.config.rejectCalls })
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
              await this.outgoing.sendOne(this.phone, message)
            }
            await this.rejectCall(id, from)
            this.calls.set(from, true)
          } else if (['timeout', 'reject', 'accept'].includes(status)) {
            this.calls.delete(from)
          }
        }
      })
    }
  }

  async disconnect() {
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
  async send(payload: any) {
    const { status, type, to } = payload
    try {
      if (status) {
        if (['sent', 'delivered', 'failed', 'progress', 'read'].includes(status)) {
          if (status == 'read') {
            const key = await this.store?.dataStore?.loadKey(payload?.message_id)
            console.debug('key %s for %s', key, payload?.message_id)
            if (key) {
              console.debug('Baileys read message key %s...', key)
              await this.readMessages([key])
              console.debug('Baileys read message key %s!', key)
            }
          }
          const r: Response = { ok: { success: true } }
          return r
        } else {
          throw new Error(`Unknow message status ${status}`)
        }
      } else if (type) {
        if (['text', 'image', 'audio', 'document', 'video', 'template'].includes(type)) {
          const content: AnyMessageContent = toBaileysMessageContent(payload)
          console.debug('Send to baileys', to, content)
          const response = await this.sendMessage(to, content)
          let sockDelays = delays.get(this.phone)
          let toDelay
          try {
            toDelay = sockDelays.get(to)
            try {
              await toDelay(this.phone, to)
              sockDelays.set(to, continueAfterSecondMessage)
            } catch (error) {
              sockDelays.set(to, delayOnSecondMessage)
            }
          } catch (error) {
            sockDelays = new Map<string, Delay>()
            delays.set(this.phone, sockDelays)
            sockDelays.set(to, delayOnSecondMessage)
          }
          console.debug('Sent to baileys', response)
          if (response) {
            const key = response.key
            const ok = {
              messaging_product: 'whatsapp',
              contacts: [
                {
                  wa_id: to.replace('+', ''),
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
            throw new SendError(1, 'unknown erro, verify logs for error details')
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
        if ([3].includes(code)) {
          this.connect()
        }
        const id = uuid()
        const ok = {
          messaging_product: 'whatsapp',
          contacts: [
            {
              wa_id: to.replace('+', ''),
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
                        recipient_id: to,
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
