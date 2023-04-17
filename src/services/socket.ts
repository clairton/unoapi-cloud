import makeWASocket, {
  DisconnectReason,
  WABrowserDescription,
  MessageRetryMap,
  fetchLatestBaileysVersion,
  WAMessageKey,
  delay,
  proto,
} from '@adiwajshing/baileys'
import { release } from 'os'
import MAIN_LOGGER from '@adiwajshing/baileys/lib/Utils/logger'

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
  (_phone: string, _message: object, _options: any): Promise<any>
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
  connecting: boolean
}

export const connect = async ({
  phone,
  store,
  onQrCode,
  onStatus,
  onDisconnect,
  onReconnect,
  onNewLogin,
  attempts = Infinity,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  config = {
    ignoreHistoryMessages: true,
    autoRestart: false,
    logLevel: '',
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    shouldIgnoreJid: (_jid: string) => false,
  },
}) => {
  let sock = null
  const msgRetryCounterMap: MessageRetryMap = {}
  const { dataStore, state, saveCreds } = store

  const status: Status = {
    attempt: 0,
    connected: false,
    disconnected: false,
    reconnecting: false,
    connecting: null,
  }

  const onConnectionUpdate = async (event) => {
    console.log('onConnectionUpdate ==>', event)
    if (event.qr) {
      if (status.attempt++ > attempts || status.disconnected) {
        const message = `The ${attempts} times of generate qrcode is exceded!`
        onStatus(message, true)
        status.reconnecting = false
        status.disconnected = true
        throw new SendError(6, message)
      } else {
        onQrCode(event.qr, status.attempt, attempts)
      }
    }
    if (event.connection === 'open') onConnected()
    else if (event.connection === 'close') onDisconnected(event)
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

    console.log(`${phone} connected`)

    fetchLatestBaileysVersion().then(({ version, isLatest }) => {
      const message = `Connnected using Whatsapp Version v${version.join('.')}, is latest? ${isLatest}`
      onStatus(message, false)
    })
  }

  const onDisconnected = async ({ lastDisconnect }) => {
    status.connected = false
    const statusCode = lastDisconnect?.error?.output?.statusCode
    console.log(`${phone} disconnected with status: ${statusCode}`)
    onDisconnect()
    if (statusCode === DisconnectReason.loggedOut) {
      disconnect(false)
      console.log(`${phone} destroyed`)
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
    console.debug('load message for jid %s id %s', remoteJid, id)
    return dataStore.loadMessage(remoteJid, id)
  }

  const connect = async () => {
    if (status.connected) return
    console.debug('Connecting %s', phone)

    const browser: WABrowserDescription = ['Unoapi Cloud', 'Chrome', release()]

    const logger = MAIN_LOGGER.child({})
    logger.level = config.logLevel || (process.env.NODE_ENV == 'development' ? 'debug' : 'error')

    try {
      sock = makeWASocket({
        auth: state,
        printQRInTerminal: true,
        browser,
        msgRetryCounterMap,
        syncFullHistory: !config.ignoreHistoryMessages,
        logger,
        getMessage,
        shouldIgnoreJid: config.shouldIgnoreJid,
      })
    } catch (error) {
      if (error.isBoom && !error.isServer) {
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
    dataStore.bind(sock.ev)
    sock.ev.on('creds.update', saveCreds)
    sock.ev.on('connection.update', onConnectionUpdate)
  }

  const reconnect = async () => {
    console.log(`${phone} reconnecting`, status.attempt)
    await disconnect(true)
    onReconnect()
  }

  const disconnect = (reconnect) => {
    if (status.disconnected) return

    status.connected = false
    status.disconnected = !reconnect
    status.reconnecting = !!reconnect
    console.log(`${phone} disconnecting`)
    return sock.end()
  }

  const exists = async (phone) => {
    if (!status.connected) {
      throw new Error('Client is disconnected')
    }
    return dataStore.getJid(phone, sock)
  }

  const validateStatus = () => {
    if (status.disconnected) {
      if (status.connecting) {
        throw new SendError(5, 'Wait a moment, connecting process')
      } else {
        throw new SendError(3, 'Disconnected number, please read qr code')
      }
    }
  }

  const send: sendMessage = async (to, message, options = { composing: false }) => {
    validateStatus()
    const id = await exists(to)
    if (id) {
      if (options.composing) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const i: any = message
        const time = (i?.text?.length || i?.caption?.length || 1) * Math.floor(Math.random() * 10)
        await sock.presenceSubscribe(id)
        await delay(Math.floor(Math.random() * time) + 100)
        await sock.sendPresenceUpdate('composing', id)
        await delay(Math.floor(Math.random() * time) + 200)
        await sock.sendPresenceUpdate('paused', id)
      }
      console.log(`${phone} is sending message ==>`, id, message)
      return sock.sendMessage(id, message)
    }
    throw new SendError(2, `The number ${to} does not have Whatsapp Account or was a error verify this!`)
  }

  const read: readMessages = async (keys) => {
    validateStatus()
    return sock.readMessages(keys)
  }

  const rejectCall: rejectCall = async (callId: string, callFrom: string) => {
    validateStatus()
    return sock.rejectCall(callId, callFrom)
  }

  // Refresh connection every 1 hour
  if (config.autoRestart) {
    const everyHourTime = 3600000
    setInterval(reconnect, everyHourTime)
  }

  const event = (event, callback) => {
    console.info('Subscribe %s event:', phone, event)
    sock.ev.on(event, callback)
  }

  connect()

  return { event, status, send, read, rejectCall }
}
