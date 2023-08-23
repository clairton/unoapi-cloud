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

export type OnQrCode = (qrCode: string, time: number, limit: number) => Promise<void>
export type OnStatus = (text: string, important: boolean, status?: string, whatsappNumberDiferente?: boolean) => Promise<void>
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type OnDisconnected = (phone: string, payload?: any, deleteConnection?: boolean, whatsappNumberDiferente?: boolean) => Promise<void>
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

export interface disconnectInterface {
  (reconnect: boolean): Promise<void>
}

export type Status = {
  attempt: number
  connected: boolean
  disconnected: boolean
  reconnecting: boolean
  connecting: boolean | undefined
}

export const disconnectPhone = async ({ store, phone, onDisconnected }: { store: Store; phone: string; onDisconnected: OnDisconnected }) => {
  const { dataStore } = store
  dataStore.cleanSession()
  onDisconnected(phone)
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
    logLevel: '',
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
  let hasConflict = false

  const status: Status = {
    attempt: 1,
    connected: false,
    disconnected: false,
    reconnecting: false,
    connecting: undefined,
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const onConnectionUpdate = async (event: any) => {
    console.log('onConnectionUpdate ==>', phone, event)
    if (event.qr) {
      console.debug('QRCode generate....... %s of %s', status.attempt, attempts)
      console.log('status', status)
      // if (status.attempt > attempts) {
      //   const message = `The ${attempts} times of generate qrcode is exceded!`
      //   onStatus(message, true)
      //   status.reconnecting = false
      //   status.connecting = false
      //   status.connected = false
      //   status.disconnected = true
      //   status.attempt = 1
      //   sock && sock.logout()
      //   dataStore.cleanSession()
      // } else {
      //   onQrCode(event.qr, status.attempt, attempts)
      //   status.attempt++
      // }
      onQrCode(event.qr, status.attempt, attempts)
    }
    if (event.connection === 'open') onConnected()
    else if (event.connection === 'close') onDisconnect(event)
    else if (event.connection === 'connecting') onStatus(`Connnecting...`, false, 'QRCODE')
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

    console.log(`${phone} connected`)

    fetchLatestBaileysVersion().then(({ version, isLatest }) => {
      const message = `Connnected using Whatsapp Version v${version.join('.')}, is latest? ${isLatest}`
      onStatus(message, false, 'CONNECTED')
    })
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const onDisconnect = async (payload: any) => {
    const { lastDisconnect } = payload
    status.connected = false
    status.connecting = false
    const statusCode = lastDisconnect?.error?.output?.statusCode
    console.log(`${phone} disconnected with status: ${statusCode}`)
    onDisconnected(phone, payload)
    if (statusCode === DisconnectReason.loggedOut) {
      if (!hasConflict) {
        disconnect(false)
        console.log(`${phone} destroyed`)
        dataStore.cleanSession()
        const message = `The session is removed in Whatsapp App, send a message here to reconnect!`
        onStatus(message, true, 'DISCONECTED')
      }
    } else if (statusCode === DisconnectReason.connectionReplaced) {
      disconnect(false)
      const message = `The session must be unique, close connection, send a message here to reconnect if him was offline!`
      onStatus(message, true, 'DISCONECTED')
    } else if (statusCode === DisconnectReason.connectionClosed) {
      disconnect(false)
      // dataStore.cleanSession()
    } else {
      reconnect()
    }
  }

  const getMessage = async (key: proto.IMessageKey): Promise<proto.IMessage | undefined> => {
    const { remoteJid, id } = key
    console.debug('load message for jid %s id %s', remoteJid, id)
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    const message = await dataStore.loadMessage(remoteJid!, id!)
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    return message?.message ? new Promise((resolve) => resolve(message.message!)) : undefined
  }

  const connect = async () => {
    if (status.connected || status.connecting) return
    console.debug('Connecting %s', phone)
    status.connecting = true

    const browser: WABrowserDescription = ['Respondai', 'Chrome', release()]

    const logger = MAIN_LOGGER.child({})
    logger.level = config.logLevel || (process.env.NODE_ENV == 'development' ? 'debug' : 'error')

    try {
      sock = makeWASocket({
        auth: state,
        printQRInTerminal: true,
        browser,
        msgRetryCounterCache,
        syncFullHistory: !config.ignoreHistoryMessages,
        logger,
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
      sock.ev.on('creds.update', async (creds) => {
        console.log('credenciais', creds)
        if (creds?.me) {
          const numberPhoneCreds = creds.me?.id.split(':')[0]
          let numberWithExtraNine
          if (numberPhoneCreds.startsWith('55') && numberPhoneCreds.length < 13) {
            numberWithExtraNine = numberPhoneCreds.substring(0, 4) + '9' + numberPhoneCreds.substring(4)
          }
          if (numberPhoneCreds == phone) {
            await saveCreds()
          } else if (numberWithExtraNine && numberWithExtraNine == phone) {
            await saveCreds()
          } else {
            hasConflict = true
            console.log('Numero diferentes')
            await onStatus(
              `O número do telefone informado ${phone} é diferente do QRcode lido (número ${numberPhoneCreds})`,
              true,
              'DISCONECTED',
              true,
            )
            await onDisconnected(phone, '', true, true)
          }
        }
      })
      sock.ev.on('connection.update', onConnectionUpdate)
    }
  }

  const reconnect = async () => {
    console.log(`${phone} reconnecting`, status.attempt)
    await disconnect(true)
    onReconnect()
  }

  const disconnect: disconnectInterface = async (reconnect: boolean) => {
    if (status.disconnected) return

    status.connected = false
    status.disconnected = !reconnect
    status.reconnecting = !!reconnect
    if (!reconnect) {
      console.warn('LOGOUT')
      await sock?.logout()
    }
    console.log(`${phone} disconnecting`)
    return sock && sock.end(undefined)
  }
  const disconnectManual: disconnectInterface = async (reconnect: boolean) => {
    if (status.disconnected) return

    status.connected = false
    status.disconnected = !reconnect
    status.reconnecting = !!reconnect
    if (!reconnect) {
      console.warn('LOGOUT')
      await sock?.logout()
    }
    console.log(`${phone} disconnecting`)
    return sock && sock.end(undefined)
  }

  const exists = async (phone: string) => {
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    return dataStore.getJid(phone, sock!)
  }

  const validateStatus = () => {
    if (status.disconnected || !status.connected) {
      if (status.connecting) {
        // throw new SendError(5, 'Wait a moment, connecting process')
        console.warn('Wait a moment, connecting process')
      } else {
        // throw new SendError(3, 'Disconnected number, please read qr code')
        console.warn('Disconnected number, please read qr code')
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
      console.log(`${phone} is sending message ==>`, id, message)
      return sock.sendMessage(id, message)
    }
    if (isValidPhoneNumber(id)) {
      throw new SendError(2, `The number ${to} does not have Whatsapp account or was a error verify this!`)
    } else {
      throw new SendError(7, `The phone number ${to} is invalid!`)
    }
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
    console.info('Subscribe %s event:', phone, event)
    sock && sock.ev.on(event, callback)
  }

  const rejectCall: rejectCall = async (callId: string, callFrom: string) => {
    return sock && (sock as WASocket).rejectCall(callId, callFrom)
  }

  connect()

  return { event, status, send, read, rejectCall, disconnectManual }
}
