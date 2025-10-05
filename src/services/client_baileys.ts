import { GroupMetadata, WAMessage, proto, delay, isJidGroup, jidNormalizedUser, AnyMessageContent, isLidUser } from 'baileys'
import fetch, { Response as FetchResponse } from 'node-fetch'
import { Listener } from './listener'
import { Store } from './store'
import {
  connect,
  sendMessage,
  readMessages,
  rejectCall,
  OnQrCode,
  OnNotification,
  OnNewLogin,
  fetchImageUrl,
  fetchGroupMetadata,
  exists,
  logout,
  close,
  OnReconnect,
} from './socket'
import { Client, getClient, clients, Contact } from './client'
import { Config, configs, defaultConfig, getConfig, getMessageMetadataDefault } from './config'
import { toBaileysMessageContent, phoneNumberToJid, jidToPhoneNumber, getMessageType, TYPE_MESSAGES_TO_READ, TYPE_MESSAGES_MEDIA } from './transformer'
import { isUnoId, generateUnoId } from '../utils/id'
import { Response } from './response'
import QRCode from 'qrcode'
import { Template } from './template'
import logger from './logger'
import { CONVERT_AUDIO_MESSAGE_TO_OGG, FETCH_TIMEOUT_MS, VALIDATE_MEDIA_LINK_BEFORE_SEND } from '../defaults'
import { t } from '../i18n'
import { ClientForward } from './client_forward'
import { SendError } from './send_error'
import audioConverter from '../utils/audio_converter'

const attempts = 3

interface Delay {
  (phone: string, to: string): Promise<void>
}

const delays: Map<string, Map<string, Delay>> = new Map()

export const getClientBaileys: getClient = async ({
  phone,
  listener,
  getConfig,
  onNewLogin,
}: {
  phone: string
  listener: Listener
  getConfig: getConfig
  onNewLogin: OnNewLogin
}): Promise<Client> => {
  if (!clients.has(phone)) {
    logger.info('Creating client baileys %s', phone)
    const config = await getConfig(phone)
    let client
    if (config.connectionType == 'forward') {
      logger.info('Connecting client forward %s', phone)
      client = new ClientForward(phone, getConfig, listener)
    } else {
      logger.info('Connecting client baileys %s', phone)
      client = new ClientBaileys(phone, listener, getConfig, onNewLogin)
    }
    if (config.autoConnect) {
      logger.info('Connecting client %s', phone)
      await client.connect(1)
      logger.info('Created and connected client %s', phone)
    } else {
      logger.info('Config client to not auto connect %s', phone)
    }
    clients.set(phone, client)
  } else {
    logger.debug('Retrieving client baileys %s', phone)
  }
  return clients.get(phone) as Client
}

const sendError = new SendError(15, t('reloaded_session'))

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const readMessagesDefault: readMessages = async (_keys) => {
  throw sendError
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const rejectCallDefault: rejectCall = async (_keys) => {
  throw sendError
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const fetchImageUrlDefault: fetchImageUrl = async (_jid: string) => ''

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const fetchGroupMetadataDefault: fetchGroupMetadata = async (_jid: string) => {
  throw sendError
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const existsDefault: exists = async (_jid: string) => {
  throw sendError
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const logoutDefault: logout = async () => {}

const closeDefault = async () => logger.info(`Close connection`)

export class ClientBaileys implements Client {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  readonly sendMessageDefault: sendMessage = async (_phone: string, _message: AnyMessageContent, _options: unknown) => {
    const sessionStore = this?.phone && await (await this?.config?.getStore(this.phone, this.config)).sessionStore
    if (sessionStore) {
      if (!await sessionStore.isStatusConnecting(this.phone)) {
        clients.delete(this.phone)
      }
      if (await sessionStore.isStatusOnline(this.phone)) {
        await sessionStore.setStatus(this.phone, 'offline')
        clients.delete(this.phone)
      }
    }
    throw sendError
  }

  private phone: string
  private config: Config = defaultConfig
  private close: close = closeDefault
  private sendMessage = this.sendMessageDefault
  private event
  private fetchImageUrl = fetchImageUrlDefault
  private exists = existsDefault
  private socketLogout: logout = logoutDefault
  private fetchGroupMetadata = fetchGroupMetadataDefault
  private readMessages = readMessagesDefault
  private rejectCall: rejectCall | undefined = rejectCallDefault
  private listener: Listener
  private store: Store | undefined
  private calls = new Map<string, boolean>()
  private getConfig: getConfig
  private onNewLogin

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private onWebhookError = async (error: any) => {
    const { sessionStore } = this.store!
    if (!this.config.throwWebhookError && error.name === 'FetchError' && (await sessionStore.isStatusOnline(this.phone))) {
      return this.sendMessage(
        phoneNumberToJid(this.phone),
        { text: `Error on send message to webhook: ${error.message}`},
        {}
      )
    }
    if (this.config.throwWebhookError) {
      throw error
    }
  }

  private onNotification: OnNotification = async (text: string, important) => {
    if (this.config.sendConnectionStatus || important) {
      const id = generateUnoId('NOT')
      const waMessageKey = {
        fromMe: true,
        remoteJid: phoneNumberToJid(this.phone),
        id,
      }
      const payload = {
        key: waMessageKey,
        message: {
          conversation: text,
        },
      }
      logger.debug('onNotification %s', JSON.stringify(payload))
      if (this.config.sessionWebhook) {
        try {
          const { sessionStore } = this.store!
          const body = JSON.stringify({ info: { phone: this.phone }, status: await sessionStore.getStatus(this.phone), ...payload })
          const response = await fetch(this.config.sessionWebhook, {
            method: 'POST',
            body: body,
            headers: { 'Content-Type': 'application/json' },
          })
          logger.debug('Response OnNotification Webhook Session', response)
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
        } catch (error: any) {
          logger.error(error, 'Erro on send status')
          await this.onWebhookError(error)
        }
      } else {
        await this.listener.process(this.phone, [payload], 'status')
      }
    }
  }

  private onQrCode: OnQrCode = async (qrCode: string, time, limit) => {
    logger.debug('Received qrcode %s %s', this.phone, qrCode)
    const id = generateUnoId('QR')
    const qrCodeUrl = await QRCode.toDataURL(qrCode)
    const remoteJid = phoneNumberToJid(this.phone)
    const waMessageKey = {
      fromMe: true,
      remoteJid,
      id,
    }
    const message =  t('qrcode_attemps', time, limit)
    const waMessage: WAMessage = {
      key: waMessageKey,
      message: {
        imageMessage: {
          url: qrCodeUrl,
          mimetype: 'image/png',
          fileLength: qrCode.length,
          caption: message,
        },
      },
    }
    if (this.config.sessionWebhook) {
      const { sessionStore } = this.store!
      const body = JSON.stringify({ info: { phone: this.phone }, status: await sessionStore.getStatus(this.phone), ...waMessage })
      try {
        const response = await fetch(this.config.sessionWebhook, {
          method: 'POST',
          body: body,
          headers: { 'Content-Type': 'application/json' },
        })
        logger.debug('Response Webhook Session', response)
      } catch (error) {
        logger.error(error, 'Erro on send qrcode')
        await this.onWebhookError(error)
      }
    } else {
      await this.listener.process(this.phone, [waMessage], 'qrcode')
    }
  }

  private onReconnect: OnReconnect = async (time: number) => this.connect(time)

  private delayBeforeSecondMessage: Delay = async (phone, to) => {
    const time = 2000
    logger.debug(`Sleep for ${time} before second message ${phone} => ${to}`)
    delays && (delays.get(phone) || new Map()).set(to, this.continueAfterSecondMessage)
    return delay(time)
  }

  // eslint-disable-next-line @typescript-eslint/no-empty-function, @typescript-eslint/no-unused-vars
  private continueAfterSecondMessage: Delay = async (_phone, _to) => {}

  constructor(phone: string, listener: Listener, getConfig: getConfig, onNewLogin: OnNewLogin) {
    this.phone = phone
    this.listener = listener
    this.getConfig = getConfig
    this.onNewLogin = onNewLogin
  }

  async connect(time: number) {
    logger.debug('Client Baileys connecting for %s', this.phone)
    this.config = await this.getConfig(this.phone)
    this.store = await this.config.getStore(this.phone, this.config)
    const { sessionStore } = this.store

    await sessionStore.syncConnection(this.phone)
    if (await sessionStore.isStatusConnecting(this.phone)) {
      logger.warn('Already Connecting %s', this.phone)
      return
    }
    if (await sessionStore.isStatusOnline(this.phone)) {
      logger.warn('Already Connected %s', this.phone)
      return
    }
    if (await sessionStore.isStatusStandBy(this.phone)) {
      logger.warn('Standby %s', this.phone)
      return
    }

    const result = await connect({
      phone: this.phone,
      store: this.store!,
      attempts,
      time,
      onQrCode: this.onQrCode,
      onNotification: this.onNotification,
      onNewLogin: this.onNewLogin,
      config: this.config,
      onDisconnected: async () => this.disconnect(),
      onReconnect: this.onReconnect
    })
    if (!result) {
      logger.error('Socket connect return empty %s', this.phone)
      return
    }
    const { send, read, event, rejectCall, fetchImageUrl, fetchGroupMetadata, exists, close, logout } = result
    this.event = event
    this.sendMessage = send
    this.readMessages = read
    this.rejectCall = rejectCall
    this.fetchImageUrl = this.config.sendProfilePicture ? fetchImageUrl : fetchImageUrlDefault
    this.fetchGroupMetadata = fetchGroupMetadata
    this.close = close
    this.exists = exists
    this.socketLogout = logout
    this.config.getMessageMetadata = async <T>(data: T) => {
      logger.debug(data, 'Put metadata in message')
      return this.getMessageMetadata(data)
    }
    await this.subscribe()
    logger.debug('Client Baileys connected for %s', this.phone)
  }

  async disconnect() {
    logger.debug('Disconnect client store for %s', this?.phone)
    this.store = undefined

    await this.close()
    clients.delete(this?.phone)
    configs.delete(this?.phone)
    this.sendMessage = this.sendMessageDefault
    this.readMessages = readMessagesDefault
    this.rejectCall = rejectCallDefault
    this.fetchImageUrl = fetchImageUrlDefault
    this.fetchGroupMetadata = fetchGroupMetadataDefault
    this.exists = existsDefault
    this.close = closeDefault
    this.config = defaultConfig
    this.socketLogout = logoutDefault
    this.config.getMessageMetadata = getMessageMetadataDefault
  }

  async subscribe() {
    this.event('messages.upsert', async (payload: { messages: any[]; type }) => {
      logger.debug('messages.upsert %s', this.phone, JSON.stringify(payload))
      await this.listener.process(this.phone, payload.messages, payload.type)
      if (this.config.readOnReceipt && payload.messages[0] && !payload.messages[0]?.fromMe) {
        await Promise.all(
          payload.messages
            .filter((message: any) => {
              const messageType = getMessageType(message)
              return !message?.key?.fromMe && messageType && TYPE_MESSAGES_TO_READ.includes(messageType)
            })
            .map(async (message: any) => {
              return this.readMessages([message.key!])
            })
        )
      }
    })
    this.event('messages.update', async (messages: object[]) => {
      logger.debug('messages.update %s %s', this.phone, JSON.stringify(messages))
      return this.listener.process(this.phone, messages, 'update')
    })
    this.event('message-receipt.update', (updates: object[]) => {
      logger.debug('message-receipt.update %s %s', this.phone, JSON.stringify(updates))
      this.listener.process(this.phone, updates, 'update')
    })
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    this.event('messages.delete', (updates: any) => {
      logger.debug('messages.delete %s', this.phone, JSON.stringify(updates))
      this.listener.process(this.phone, updates, 'delete')
    })
    if (!this.config.ignoreHistoryMessages) {
      logger.info('Config import history messages %', this.phone)
      this.event('messaging-history.set', async ({ messages, isLatest }: { messages: proto.IWebMessageInfo[]; isLatest?: boolean }) => {
        logger.info('Importing history messages, is latest %s %s', isLatest, this.phone)
        this.listener.process(this.phone, messages, 'history')
      })
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    this.event('call', async (events: any[]) => {
      for (let i = 0; i < events.length; i++) {
        const { from, id, status } = events[i]
        if (status == 'ringing' && !this.calls.has(from)) {
          this.calls.set(from, true)
          if (this.config.rejectCalls && this.rejectCall) {
            await this.rejectCall(id, from)
            const response = await this.sendMessage(from, { text: this.config.rejectCalls }, {})
            const message = {
              key: {
                fromMe: true,
                remoteJid: from,
                id: response.key.id,
              },
              message: {
                conversation: this.config.rejectCalls,
              },
            }
            await this.listener.process(this.phone, [message], 'append')
            logger.info('Rejecting calls %s %s', this.phone, this.config.rejectCalls)
          }
          const messageCallsWebhook = this.config.rejectCallsWebhook || this.config.messageCallsWebhook
          if (messageCallsWebhook) {
            const waMessageKey = {
              fromMe: false,
              id: generateUnoId('CALL'),
              remoteJid: from,
            }
            const message = {
              key: waMessageKey,
              message: {
                conversation: messageCallsWebhook,
              },
            }
            await this.listener.process(this.phone, [message], 'notify')
          }
          setTimeout(() => {
            logger.debug('Clean call rejecteds %s', from)
            this.calls.delete(from)
          }, 10_000)
        }
      }
    })
  }

  async logout() {
    logger.debug('Logout client store for %s', this?.phone)
    await this.socketLogout()
    await this.disconnect()
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async send(payload: any, options: any = {}) {
    const { status, type, to } = payload
    try {
      if (status) {
        if (['sent', 'delivered', 'failed', 'progress', 'read', 'deleted'].includes(status)) {
          if (status == 'read') {
            const currentStatus = await this.store?.dataStore?.loadStatus(payload?.message_id)
            if (currentStatus != status) {
              const key = await this.store?.dataStore?.loadKey(payload?.message_id)
              logger.debug('key %s for %s', JSON.stringify(key), payload?.message_id)
              if (key?.id) {
                if (isUnoId(key?.id)) {
                  logger.debug('Ignore read message for %s with key id %s reading message key %s...', this.phone, key?.id)
                } else {
                  logger.debug('baileys %s reading message key %s...', this.phone, JSON.stringify(key))
                  if (await this.readMessages([key])) {
                    await this.store?.dataStore?.setStatus(payload?.message_id, status)
                    logger.debug('baileys %s read message key %s!', this.phone, JSON.stringify(key))
                  } else {
                    logger.debug('baileys %s not read message key %s!', this.phone, JSON.stringify(key))
                    throw `not online session ${this.phone}`
                  }
                }
              }
            } else {
              logger.debug('baileys %s already read message id %s!', this.phone, payload?.message_id)
            }
          } else if (status == 'deleted') {
            const key = await this.store?.dataStore?.loadKey(payload?.message_id)
            logger.debug('key %s for %s', JSON.stringify(key), payload?.message_id)
            if (key?.id) {
              if (isUnoId(key?.id)) {
                logger.debug('Ignore delete message for %s with key id %s reading message key %s...', this.phone, key?.id)
              } else {
                logger.debug('baileys %s deleting message key %s...', this.phone, JSON.stringify(key))
                if (await this.sendMessage(key.remoteJid!, { delete: key }, {})) {
                  await this.store?.dataStore?.setStatus(payload?.message_id, status)
                  logger.debug('baileys %s delete message key %s!', this.phone, JSON.stringify(key))
                } else {
                  logger.debug('baileys %s not delete message key %s!', this.phone, JSON.stringify(key))
                  throw `not online session ${this.phone}`
                }
              }
            }
          } else {
            await this.store?.dataStore?.setStatus(payload?.message_id, status)
          }
          const r: Response = { ok: { success: true } }
          return r
        } else {
          throw new Error(`Unknow message status ${status}`)
        }
      } else if (type) {
        if (['text', 'image', 'audio', 'sticker', 'document', 'video', 'template', 'interactive', 'contacts'].includes(type)) {
          let content
          if ('template' === type) {
            const template = new Template(this.getConfig)
            content = await template.bind(this.phone, payload.template.name, payload.template.components)
          } else {
            if (VALIDATE_MEDIA_LINK_BEFORE_SEND && TYPE_MESSAGES_MEDIA.includes(type)) {
              const link = payload[type] && payload[type].link
              if (link) {
                const response: FetchResponse = await fetch(link, { signal: AbortSignal.timeout(FETCH_TIMEOUT_MS), method: 'HEAD'})
                if (!response.ok) {
                  throw new SendError(11, t('invalid_link', response.status, link))
                }
              }
            }
            content = toBaileysMessageContent(payload, this.config.customMessageCharactersFunction)
          }
          let quoted: WAMessage | undefined = undefined
          let disappearingMessagesInChat: boolean | number = false
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
          if (payload?.ttl) {
            disappearingMessagesInChat = payload.ttl
          }
          if (CONVERT_AUDIO_MESSAGE_TO_OGG && content.audio && content.ptt) {
            try {
              const url = content.audio?.url
              if (url) {
                const { buffer, waveform } = await audioConverter(url)
                content.audio = buffer
                content.waveform = waveform
                content.mimetype = 'audio/ogg; codecs=opus'
                content.ptt = true
                logger.debug('Audio converted to OGG/Opus PTT for %s', url)
              } else {
                logger.debug('Skip audio conversion (not mp3 or missing url). url: %s', url)
              }
            } catch (err) {
              logger.warn(err, 'Ignore error converting audio to ogg sending original')
            }
          }
          // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
          const sockDelays = delays.get(this.phone) || (delays.set(this.phone, new Map<string, Delay>()) && delays.get(this.phone)!)
          // eslint-disable-next-line @typescript-eslint/no-unused-vars
          const toDelay = sockDelays.get(to) || (async (_phone: string, to) => sockDelays.set(to, this.delayBeforeSecondMessage))
          await toDelay(this.phone, to)
          let response
          if (content?.listMessage) {
            response = await this.sendMessage(
              to,
              {
                forward: {
                  key: {
                    remoteJid: jidToPhoneNumber(jidNormalizedUser(this.store?.state.creds.me?.id)),
                    fromMe: true,
                  },
                  message: {
                    ...content,
                  },
                },
              },
              {
                composing: this.config.composingMessage,
                quoted,
                disappearingMessagesInChat,
                ...options,
              },
            )
          } else {
            response = await this.sendMessage(to, content, {
              composing: this.config.composingMessage,
              quoted,
              disappearingMessagesInChat,
              ...options,
            })
          }

          if (response) {
            logger.debug('Sent to baileys %s', JSON.stringify(response))
            const key = response.key
            await this.store?.dataStore?.setKey(key.id, key)
            await this.store?.dataStore?.setMessage(key.remoteJid, response)
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
          }
        } else {
          throw new Error(`Unknow message type ${type}`)
        }
      }
    } catch (ee) {
      let e = ee
      if (ee.message == 'Media upload failed on all hosts') {
        const link = payload[type] && payload[type].link
        if (link) {
          const response: FetchResponse = await fetch(link, { signal: AbortSignal.timeout(FETCH_TIMEOUT_MS), method: 'HEAD'})
          if (!response.ok) {
            e = new SendError(11, t('invalid_link', response.status, link))
          }
        } else {
          e = new SendError(11, ee.message)
        }
      }
      if (e instanceof SendError) {
        const code = e.code
        const title = e.title
        await this.onNotification(title, true)
        if ([3, '3', 12, '12'].includes(code)) {
          await this.close()
          await this.connect(1)
        }
        const id = generateUnoId('WARN')
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
                      display_phone_number: this.phone.replace('+', ''),
                      phone_number_id: this.phone.replace('+', ''),
                    },
                    statuses: [
                      {
                        id,
                        recipient_id: jidToPhoneNumber(to || this.phone, ''),
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
    const isOnline = await this.store?.sessionStore?.isStatusOnline(this.phone)
    if (!isOnline) {
      logger.debug('Skip retrieving group metadata store present: %s status: %s', !!this.store, isOnline)
      if (message['key'] && message['key']['remoteJid'] && isJidGroup(message['key']['remoteJid'])) {
        const groupMetadata = {
          // owner_country_code: '55',
          addressingMode: isLidUser(message['key']['remoteJid']) ? 'lid' : 'pn',
          id: message['key']['remoteJid'],
          owner: '',
          subject: message['key']['remoteJid'],
          participants: [],
        }
        message['groupMetadata'] = groupMetadata!
      }
      return message
    }
    const key = message && message['key']
    let remoteJid
    if (key.remoteJid && isJidGroup(key.remoteJid)) {
      logger.debug('Retrieving group metadata...')
      remoteJid = key.participant
      let groupMetadata: GroupMetadata | undefined
      try {
        groupMetadata = await this.fetchGroupMetadata(key.remoteJid)
      } catch (error) {
        logger.warn(error, 'Ignore error fetch group metadata')
      }
      if (groupMetadata) {
        logger.debug(groupMetadata, 'Retrieved group metadata!')
      } else {
        groupMetadata = {
          // owner_country_code: '55',
          addressingMode: isLidUser(key.remoteJid) ? 'lid' : 'pn',
          id: key.remoteJid,
          owner: '',
          subject: key.remoteJid,
          participants: [],
        }
      }
      message['groupMetadata'] = groupMetadata!
      logger.debug(`Retrieving group profile picture...`)
      try {
        const profilePictureGroup = await this.fetchImageUrl(key.remoteJid)
        if (profilePictureGroup) {
          logger.debug(`Retrieved group picture! ${profilePictureGroup}`)
          groupMetadata['profilePicture'] = profilePictureGroup
        }
      } catch (error) {
        logger.warn(error)
        logger.warn(error, 'Ignore error on retrieve group profile picture')
      }
    } else {
      remoteJid = key.remoteJid
    }
    if (remoteJid) {
      const jid = await this.exists(remoteJid)
      if (jid) {
        try {
          logger.debug(`Retrieving user picture for %s...`, jid)
          const profilePicture = await this.fetchImageUrl(jid)
          if (profilePicture) {
            logger.debug('Retrieved user picture %s for %s!', profilePicture, jid)
            message['profilePicture'] = profilePicture
          } else {
            logger.debug(`Not found user picture for %s!`, jid)
          }
        } catch (error) {
          logger.warn(error)
          logger.warn(error, 'Ignore error on retrieve user profile picture')
        }
      }
    }
    return message
  }

  public async contacts(numbers: string[]) {
    const contacts: Contact[] = []
    for (let index = 0; index < numbers.length; index++) {
      const number = numbers[index]
      const testJid = jidToPhoneNumber(number, '')
      const realJid = await this.exists(testJid)
      contacts.push({
        wa_id: realJid,
        input: number,
        status: realJid ? 'valid' : 'invalid'
      })
    }
    return contacts
  }
}

