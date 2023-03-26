import makeWASocket, { DisconnectReason, WABrowserDescription, MessageRetryMap, fetchLatestBaileysVersion, WAMessageKey } from '@adiwajshing/baileys'
import { release } from 'os'
import logger from '@adiwajshing/baileys/lib/Utils/logger'
logger.level = process.env.LOG_LEVEL || (process.env.NODE_ENV === 'development' ? 'debug' : 'error')

export class SendError extends Error {
  readonly code: number
  readonly title: string
  constructor(code: number, title: string) {
    super(`${code}: ${title}`)
  }
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars, @typescript-eslint/no-explicit-any
export interface sendMessage {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (_phone: string, _message: object): Promise<any>
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
  number,
  store,
  onQrCode,
  onStatus,
  onDisconnect,
  timeout = 1e3,
  attempts = Infinity,
  config = { ignoreHistoryMessages: true },
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

  const messages = []
  const reads = []

  const onConnectionUpdate = (event) => {
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
      const message = `Please be careful, the http endpoint is unprotected and if it is exposed in the network, someone else can send message as you!`
      onStatus(message, true)
    }
  }

  const onConnected = () => {
    status.attempt = 0
    status.connected = true
    status.disconnected = false
    status.reconnecting = false

    console.log(`${number} connected`)

    fetchLatestBaileysVersion().then(( { version, isLatest }) => {
      const message = `Connnected using Whatsapp Version v${version.join('.')}, is latest? ${isLatest}`
      onStatus(message, false)
    })

    while (messages.length) {
      // eslint-disable-next-line prefer-spread
      send.apply(null, messages.pop())
    }

    while (reads.length) {
      // eslint-disable-next-line prefer-spread
      read.apply(null, reads.pop())
    }
  }

  const onDisconnected = async ({ lastDisconnect }) => {
    status.connected = false
    const statusCode = lastDisconnect?.error?.output?.statusCode
    const shouldReconnect = statusCode !== DisconnectReason.loggedOut

    console.log(`${number} disconnected with status: ${statusCode}`)
    onDisconnect()
    if (statusCode === DisconnectReason.loggedOut) {
      status.reconnecting = false
      status.disconnected = true
      console.log(`${number} destroyed`)
      dataStore.cleanSession()
      return
    }
    if (shouldReconnect) {
      reconnect()
    } else {
      const message = `The session is removed in Whatsapp App, send a message here to reconnect!`
      onStatus(message, true)
    }
  }

  const connect = async () => {
    if (status.connected) return

    const browser: WABrowserDescription = ['Unoapi Cloud', 'Chrome', release()]
    sock = makeWASocket({
      auth: state,
      printQRInTerminal: true,
      browser,
      msgRetryCounterMap,
      syncFullHistory: !config.ignoreHistoryMessages,
      logger,
    })
    dataStore.bind(sock.ev)
    sock.ev.on('creds.update', saveCreds)
    sock.ev.on('connection.update', onConnectionUpdate)
  }

  const reconnect = () => {
    console.log(`${number} reconnecting`, status.attempt)
    setTimeout(connect, timeout)
  }

  const disconnect = (reconnect) => {
    if (status.disconnected) return

    status.connected = false
    status.disconnected = !reconnect
    status.reconnecting = !!reconnect
    console.log(`${number} disconnecting`)
    return sock.end()
  }

  const restart = async () => {
    return disconnect(true).then(connect)
  }

  const exists = async (phone) => {
    if (!status.connected) {
      throw new Error('Client is disconnected')
    }
    return dataStore.getJid(phone, sock)
  }

  const send: sendMessage = async (phone, message) => {
    if (status.disconnected) {
      if (status.connecting) {
        throw new SendError(5, 'Wait a moment, connecting process')
      } else {
        throw new SendError(3, 'disconnect number, please read qr code')
      }
    }

    if (!status.connected) {
      messages.unshift([phone, message])
      return
    }

    const id = await exists(phone)

    if (id) {
      console.log(`${number} is sending message ==>`, id, message)
      return sock.sendMessage(id, message)
    }

    throw new SendError(2, `The number ${phone} does not have Whatsapp Account or was a error verify this!`)
  }

  const read: readMessages = async (keys) => {
    if (status.disconnected) {
      if (status.connecting) {
        throw new SendError(5, 'Wait a moment, connecting process')
      } else {
        throw new SendError(3, 'disconnect number, please read qr code')
      }
    }

    if (!status.connected) {
      reads.unshift(keys)
      return
    }

    return sock.readMessages(keys)
  }

  const rejectCall: rejectCall = async (callId: string, callFrom: string) => {
    if (status.disconnected) {
      if (status.connecting) {
        throw new SendError(5, 'Wait a moment, connecting process')
      } else {
        throw new SendError(3, 'disconnect number, please read qr code')
      }
    }

    return sock.rejectCall(callId, callFrom)
  }

  connect()

  return { ev: sock.ev, status, send, read, rejectCall }
}
