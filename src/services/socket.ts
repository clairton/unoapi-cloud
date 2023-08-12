import makeWASocket, {
  DisconnectReason,
  WABrowserDescription,
  fetchLatestBaileysVersion,
  WAMessageKey,
  delay,
  proto,
  isJidGroup,
  WASocket,
  AnyMessageContent,
  BaileysEventMap,
} from '@whiskeysockets/baileys'
import { release } from 'os'
import MAIN_LOGGER from '@whiskeysockets/baileys/lib/Utils/logger'
import { Config } from './config'
import { Store } from './store'
import NodeCache from 'node-cache'
import { isValidPhoneNumber } from './transformer'
import logger from './logger'
import { Level } from 'pino'

export type OnQrCode = (qrCode: string, time: number, limit: number) => Promise<void>
export type OnStatus = (text: string, important: boolean) => Promise<void>
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type OnDisconnected = (phone: string, payload: any) => Promise<void>
export type OnNewLogin = (phone: string) => Promise<void>
export type OnReconnect = () => Promise<void>

export class SendError extends Error {
  readonly code: number
  readonly title: string
  constructor(code: number, title: string) {
    super(`${code}: ${title}`)
    this.code = code
    this.title = title
  }
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars, @typescript-eslint/no-explicit-any
export interface sendMessage {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (_phone: string, _message: AnyMessageContent, _options: any): Promise<any>
}
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export interface readMessages {
  (_keys: WAMessageKey[]): Promise<void>
}
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export interface rejectCall {
  (_callId: string, _callFrom: string): Promise<void>
}

export type Status = {
  attempt: number
  connected: boolean
  disconnected: boolean
  reconnecting: boolean
  connecting: boolean | undefined
}

export const connect = async ({
  phone,
  store,
  onQrCode,
  onStatus,
  onDisconnected,
  onReconnect,
  onNewLogin,
  attempts = Infinity,
  config = {
    ignoreHistoryMessages: true,
    autoRestart: false,
    logLevel: undefined,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    shouldIgnoreJid: (_jid: string) => false,
  },
}: {
  phone: string
  store: Store
  onQrCode: OnQrCode
  onStatus: OnStatus
  onDisconnected: OnDisconnected
  onReconnect: OnReconnect
  onNewLogin: OnNewLogin
  attempts: number
  config: Partial<Config>
}) => {
  let sock: WASocket | undefined = undefined
  const msgRetryCounterCache = new NodeCache()
  const { dataStore, state, saveCreds } = store

  const status: Status = {
    attempt: 1,
    connected: false,
    disconnected: false,
    reconnecting: false,
    connecting: undefined,
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const onConnectionUpdate = async (event: any) => {
    logger.debug('onConnectionUpdate ==>', phone, event)
    if (event.qr) {
      logger.debug('QRCode generate....... %s of %s', status.attempt, attempts)
      if (status.attempt > attempts) {
        const message = `The ${attempts} times of generate qrcode is exceded!`
        onStatus(message, true)
        status.reconnecting = false
        status.connecting = false
        status.connected = false
        status.disconnected = true
        status.attempt = 1
        sock && sock.logout()
        dataStore.cleanSession()
      } else {
        onQrCode(event.qr, status.attempt, attempts)
        status.attempt++
      }
    }
    if (event.connection === 'open') onConnected()
    else if (event.connection === 'close') onDisconnect(event)
    else if (event.connection === 'connecting') onStatus(`Connnecting...`, false)
    else if (event.isNewLogin) {
      onNewLogin(phone)
    }
  }

  const onConnected = () => {
    status.attempt = 0
    status.connected = true
    status.disconnected = false
    status.reconnecting = false
    status.connecting = false

    logger.info(`${phone} connected`)

    fetchLatestBaileysVersion().then(({ version, isLatest }) => {
      const message = `Connnected using Whatsapp Version v${version.join('.')}, is latest? ${isLatest}`
      onStatus(message, false)
    })
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const onDisconnect = async (payload: any) => {
    const { lastDisconnect } = payload
    status.connected = false
    status.connecting = false
    const statusCode = lastDisconnect?.error?.output?.statusCode
    logger.info(`${phone} disconnected with status: ${statusCode}`)
    onDisconnected(phone, payload)
    if (statusCode === DisconnectReason.loggedOut) {
      disconnect(false)
      logger.info(`${phone} destroyed`)
      dataStore.cleanSession()
      const message = `The session is removed in Whatsapp App, send a message here to reconnect!`
      onStatus(message, true)
    } else if (statusCode === DisconnectReason.connectionReplaced) {
      disconnect(false)
      const message = `The session must be unique, close connection, send a message here to reconnect if him was offline!`
      return onStatus(message, true)
    } else {
      return reconnect()
    }
  }

  const getMessage = async (key: proto.IMessageKey): Promise<proto.IMessage | undefined> => {
    const { remoteJid, id } = key
    logger.debug('load message for jid %s id %s', remoteJid, id)
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    const message = await dataStore.loadMessage(remoteJid!, id!)
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    return message?.message ? new Promise((resolve) => resolve(message.message!)) : undefined
  }

  const connect = async () => {
    if (status.connected || status.connecting) return
    logger.debug('Connecting %s', phone)
    status.connecting = true

    const browser: WABrowserDescription = ['Unoapi', 'Chrome', release()]

    const loggerBaileys = MAIN_LOGGER.child({})
    logger.level = (config.logLevel || process.env.LOG_LEVEL || (process.env.NODE_ENV == 'development' ? 'debug' : 'error')) as Level

    try {
      sock = makeWASocket({
        auth: state,
        printQRInTerminal: true,
        browser,
        msgRetryCounterCache,
        syncFullHistory: !config.ignoreHistoryMessages,
        logger: loggerBaileys,
        getMessage,
        shouldIgnoreJid: config.shouldIgnoreJid,
      })
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (error: any) {
      if (error && error.isBoom && !error.isServer) {
        const statusCode = error?.output?.statusCode
        const shouldReconnect = statusCode !== DisconnectReason.loggedOut
        if (shouldReconnect) {
          disconnect(true)
          connect()
        }
      } else {
        throw error
      }
    }
    if (sock) {
      dataStore.bind(sock.ev)
      sock.ev.on('creds.update', saveCreds)
      sock.ev.on('connection.update', onConnectionUpdate)
    }
  }

  const reconnect = async () => {
    logger.info(`${phone} reconnecting`, status.attempt)
    await disconnect(true)
    onReconnect()
  }

  const disconnect = (reconnect: boolean) => {
    if (status.disconnected) return

    status.connected = false
    status.disconnected = !reconnect
    status.reconnecting = !!reconnect
    logger.info(`${phone} disconnecting`)
    return sock && sock.end(undefined)
  }

  const exists = async (phone: string) => {
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    return dataStore.getJid(phone, sock!)
  }

  const validateStatus = () => {
    if (status.disconnected || !status.connected) {
      if (status.connecting) {
        throw new SendError(5, 'Wait a moment, connecting process')
      } else {
        throw new SendError(3, 'Disconnected number, please read qr code')
      }
    }
  }

  const send: sendMessage = async (to: string, message: AnyMessageContent, options = { composing: false }) => {
    validateStatus()
    const id = isJidGroup(to) ? to : await exists(to)
    if (sock && id) {
      if (options.composing) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const i: any = message
        const time = (i?.text?.length || i?.caption?.length || 1) * Math.floor(Math.random() * 100)
        await sock.presenceSubscribe(id)
        await delay(Math.floor(Math.random() * time) + 100)
        await sock.sendPresenceUpdate(i?.text ? 'composing' : 'recording', id)
        await delay(Math.floor(Math.random() * time) + 200)
        await sock.sendPresenceUpdate('paused', id)
      }
      logger.info(`${phone} is sending message ==>`, id, message)
      return sock.sendMessage(id, message, { backgroundColor: '' })
    }
    if (!isValidPhoneNumber(to)) {
      throw new SendError(7, `The phone number ${to} is invalid!`)
    }
    throw new SendError(2, `The phone number ${to} does not have Whatsapp account!`)
  }

  const read: readMessages = async (keys: WAMessageKey[]) => {
    validateStatus()
    return sock && sock.readMessages(keys)
  }

  // Refresh connection every 1 hour
  if (config.autoRestart) {
    const everyHourTime = 3600000
    setInterval(reconnect, everyHourTime)
  }

  const event = <T extends keyof BaileysEventMap>(event: T, callback: (arg: BaileysEventMap[T]) => void) => {
    logger.info('Subscribe %s event:', phone, event)
    sock && sock.ev.on(event, callback)
  }

  const rejectCall: rejectCall = async (callId: string, callFrom: string) => {
    return sock && (sock as WASocket).rejectCall(callId, callFrom)
  }

  connect()

  return { event, status, send, read, rejectCall }
}
