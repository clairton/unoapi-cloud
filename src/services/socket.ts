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
  GroupMetadata,
  Browsers,
} from '@whiskeysockets/baileys'
import { release } from 'os'
import MAIN_LOGGER from '@whiskeysockets/baileys/lib/Utils/logger'
import { Config, defaultConfig } from './config'
import { Store } from './store'
import NodeCache from 'node-cache'
import { isValidPhoneNumber } from './transformer'
import logger from './logger'
import { Level } from 'pino'
import { SocksProxyAgent } from 'socks-proxy-agent'
import {
  isSessionStatusConnecting,
  isSessionStatusIsDisconnect,
  isSessionStatusOffline,
  isSessionStatusOnline,
  setSessionStatus,
} from './session_store'

export type OnQrCode = (qrCode: string, time: number, limit: number) => Promise<void>
export type OnNotification = (text: string, important: boolean) => Promise<void>
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type OnDisconnected = (phone: string, payload: any) => Promise<void>
export type OnNewLogin = (phone: string) => Promise<void>

export class SendError extends Error {
  readonly code: number
  readonly title: string
  constructor(code: number, title: string) {
    super(`${code}: ${title}`)
    this.code = code
    this.title = title
  }
}

export interface sendMessage {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (_phone: string, _message: AnyMessageContent, _options: unknown): Promise<any>
}

export interface readMessages {
  (_keys: WAMessageKey[]): Promise<void>
}

export interface rejectCall {
  (_callId: string, _callFrom: string): Promise<void>
}

export interface fetchImageUrl {
  (_jid: string): Promise<string | undefined>
}

export interface fetchGroupMetadata {
  (_jid: string): Promise<GroupMetadata | undefined>
}

export interface exists {
  (_jid: string): Promise<string | undefined>
}

export interface close {
  (): Promise<void>
}

export type Status = {
  attempt: number
}

export const connect = async ({
  phone,
  store,
  onQrCode,
  onNotification,
  onDisconnected,
  onNewLogin,
  attempts = Infinity,
  config = defaultConfig,
}: {
  phone: string
  store: Store
  onQrCode: OnQrCode
  onNotification: OnNotification
  onDisconnected: OnDisconnected
  onNewLogin: OnNewLogin
  attempts: number
  config: Partial<Config>
}) => {
  let sock: WASocket | undefined = undefined
  const msgRetryCounterCache = new NodeCache()
  const { dataStore, state, saveCreds } = store

  const status: Status = {
    attempt: 1,
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const onConnectionUpdate = async (event: any) => {
    logger.debug('onConnectionUpdate ==> %s %s', phone, JSON.stringify(event))
    if (event.qr) {
      logger.debug('QRCode generate... %s of %s', status.attempt, attempts)
      if (status.attempt >= attempts) {
        const message = `The ${attempts} times of generate qrcode is exceded!`
        await onNotification(message, true)
        await setSessionStatus(phone, 'disconnected')
        status.attempt = 0
        sock && sock.logout()
        dataStore.cleanSession()
      } else {
        onQrCode(event.qr, status.attempt, attempts)
        status.attempt++
      }
    }

    if (event.isNewLogin) {
      await onNewLogin(phone)
      await setSessionStatus(phone, 'online')
    }

    if (event.receivedPendingNotifications) {
      await onNotification('Received pending notifications', true)
    }

    switch (event.connection) {
      case 'open':
        await onOpen()
        break

      case 'close':
        await onClose(event)
        break

      case 'connecting':
        await onNotification(`Connnecting...`, false)
        break
    }
  }

  const onOpen = async () => {
    status.attempt = 0
    await setSessionStatus(phone, 'online')
    logger.info(`${phone} connected`)
    const { version, isLatest } = await fetchLatestBaileysVersion()
    const message = `Connected with ${phone} using Whatsapp Version v${version.join('.')}, is latest? ${isLatest} at ${new Date().toUTCString()}`
    await onNotification(message, false)
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const onClose = async (payload: any) => {
    const { lastDisconnect } = payload
    const statusCode = lastDisconnect?.error?.output?.statusCode
    logger.info(`${phone} disconnected with status: ${statusCode}`)
    await onDisconnected(phone, payload)
    if ([DisconnectReason.loggedOut, DisconnectReason.badSession, DisconnectReason.forbidden].includes(statusCode)) {
      await logout()
      const message = `The session is removed in Whatsapp App, send a message here to reconnect!`
      await onNotification(message, true)
    } else if (statusCode === DisconnectReason.connectionReplaced) {
      await close()
      const message = `The session must be unique, close connection, send a message here to reconnect if him was offline!`
      return onNotification(message, true)
    } else if (statusCode === DisconnectReason.unavailableService) {
      await close()
      const message = `The service is unavailable, please open the whastapp app to verify and after send a message again!`
      return onNotification(message, true)
    } else {
      if (status.attempt == 0) {
        const detail = lastDisconnect?.error?.output?.payload?.error
        const message = `The connection is closed with status: ${statusCode}, detail: ${detail}!`
        await onNotification(message, true)
      }
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

  const patchMessageBeforeSending = (msg: proto.IMessage) => {
    const isProductList = (listMessage: proto.Message.IListMessage | null | undefined) =>
      listMessage?.listType === proto.Message.ListMessage.ListType.PRODUCT_LIST

    if (isProductList(msg.deviceSentMessage?.message?.listMessage) || isProductList(msg.listMessage)) {
      msg = JSON.parse(JSON.stringify(msg))
      if (msg.deviceSentMessage?.message?.listMessage) {
        msg.deviceSentMessage.message.listMessage.listType = proto.Message.ListMessage.ListType.SINGLE_SELECT
      }
      if (msg.listMessage) {
        msg.listMessage.listType = proto.Message.ListMessage.ListType.SINGLE_SELECT
      }
    }
    return msg
  }

  const connect = async () => {
    if ((await isSessionStatusOnline(phone)) || (await isSessionStatusConnecting(phone))) return
    logger.debug('Connecting %s', phone)
    await setSessionStatus(phone, 'connecting')

    const browser: WABrowserDescription = config.ignoreHistoryMessages ? ['Unoapi', 'Chrome', release()] : Browsers.windows('Desktop')

    const loggerBaileys = MAIN_LOGGER.child({})
    logger.level = config.logLevel as Level

    let agent
    if (config.proxyUrl) {
      agent = new SocksProxyAgent(config.proxyUrl)
    }

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
        retryRequestDelayMs: config.retryRequestDelayMs,
        patchMessageBeforeSending,
        agent,
      })
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (error: any) {
      if (error && error.isBoom && !error.isServer) {
        await onClose({ lastDisconnect: { error } })
      } else {
        logger.error('Baileys Socket error: %s %s', error, error.stack)
        await onNotification(`Error: ${error.message}.`, true)
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
    if (status.attempt >= attempts) {
      const message = `The ${attempts} times of try connect is exceded!`
      await onNotification(message, true)
      status.attempt = 0
      return close()
    } else {
      status.attempt++
      await onNotification(`Try connnecting time ${status.attempt} of ${attempts}...`, false)
      await close()
      return connect()
    }
  }

  const close = async () => {
    if (await isSessionStatusOffline(phone)) return

    await setSessionStatus(phone, 'offline')
    logger.info(`${phone} close`)
    return sock && (await sock.end(undefined))
  }

  const logout = async () => {
    if (await isSessionStatusIsDisconnect(phone)) return
    await close()
    logger.info(`${phone} destroyed`)
    dataStore.cleanSession()

    logger.info(`${phone} disconnected`)
    await setSessionStatus(phone, 'disconnected')
    try {
      return sock && (await sock.logout())
    } catch (_error) {
      // ignore de unique error if already diconected session
    }
  }

  const exists: exists = async (phone: string) => {
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    return dataStore.getJid(phone, sock!)
  }

  const validateStatus = async () => {
    if (await isSessionStatusConnecting(phone)) {
      throw new SendError(5, 'Wait a moment, connecting process')
    } else if (await isSessionStatusIsDisconnect(phone)) {
      throw new SendError(3, 'Disconnected number, please read qr code')
    } else if (await isSessionStatusOffline(phone)) {
      connect()
    }
  }

  const send: sendMessage = async (
    to: string,
    message: AnyMessageContent,
    options: { composing: boolean; quoted: boolean | undefined } = { composing: false, quoted: undefined },
  ) => {
    await validateStatus()
    const id = isJidGroup(to) ? to : await exists(to)
    if (id) {
      if (options.composing) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const i: any = message
        const time = (i?.text?.length || i?.caption?.length || 1) * Math.floor(Math.random() * 100)
        await sock?.presenceSubscribe(id)
        await delay(Math.floor(Math.random() * time) + 100)
        await sock?.sendPresenceUpdate(i?.text ? 'composing' : 'recording', id)
        await delay(Math.floor(Math.random() * time) + 200)
        await sock?.sendPresenceUpdate('paused', id)
      }
      logger.debug(`${phone} is sending message ==> ${id} ${JSON.stringify(message)}`)
      const opts = { backgroundColor: '' }
      if (options.quoted) {
        opts['quoted'] = options.quoted
      }
      return sock?.sendMessage(id, message, opts)
    }
    if (!isValidPhoneNumber(to)) {
      throw new SendError(7, `The phone number ${to} is invalid!`)
    }
    throw new SendError(2, `The phone number ${to} does not have Whatsapp account!`)
  }

  const read: readMessages = async (keys: WAMessageKey[]) => {
    await validateStatus()
    return sock?.readMessages(keys)
  }

  if (config.autoRestartMs) {
    await onNotification(`Config to auto restart in ${config.autoRestartMs} milliseconds.`, true)
    setInterval(reconnect, config.autoRestartMs)
  }

  const event = <T extends keyof BaileysEventMap>(event: T, callback: (arg: BaileysEventMap[T]) => void) => {
    logger.info('Subscribe %s event: %s', phone, event)
    return sock?.ev?.on(event, callback)
  }

  const rejectCall: rejectCall = async (callId: string, callFrom: string) => {
    return sock?.rejectCall(callId, callFrom)
  }

  const fetchImageUrl: fetchImageUrl = async (jid: string) => {
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    return dataStore.loadImageUrl(jid, sock!)
  }

  const fetchGroupMetadata: fetchGroupMetadata = async (jid: string) => {
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    return dataStore.loadGroupMetada(jid, sock!)
  }

  connect()

  return { event, status, send, read, rejectCall, fetchImageUrl, fetchGroupMetadata, exists, close }
}
