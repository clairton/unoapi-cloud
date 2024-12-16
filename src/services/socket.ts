import makeWASocket, {
  DisconnectReason,
  WABrowserDescription,
  fetchLatestBaileysVersion,
  WAMessageKey,
  delay,
  proto,
  WASocket,
  AnyMessageContent,
  BaileysEventMap,
  GroupMetadata,
  Browsers,
  ConnectionState,
} from 'baileys'
import MAIN_LOGGER from 'baileys/lib/Utils/logger'
import { Config, defaultConfig } from './config'
import { Store } from './store'
import NodeCache from 'node-cache'
import { isIndividualJid, isValidPhoneNumber } from './transformer'
import logger from './logger'
import { Level } from 'pino'
import { SocksProxyAgent } from 'socks-proxy-agent'
import { HttpsProxyAgent } from 'https-proxy-agent'
import { useVoiceCallsBaileys } from 'voice-calls-baileys/lib/services/transport.model'
import { DEFAULT_BROWSER, WHATSAPP_VERSION, LOG_LEVEL, CONNECTING_TIMEOUT_MS } from '../defaults'
import { t } from '../i18n'

const EVENTS = [
  'connection.update',
  'creds.update',
  'messaging-history.set',
  'chats.upsert',
  'chats.update',
  'chats.phoneNumberShare',
  'chats.delete',
  'presence.update',
  'contacts.upsert',
  'contacts.update',
  'messages.delete',
  'messages.update',
  'messages.media-update',
  'messages.upsert',
  'messages.reaction',
  'message-receipt.update',
  'groups.upsert',
  'groups.update',
  'group-participants.update',
  'blocklist.set',
  'blocklist.update',
  'call',
  'labels.edit',
  'labels.association',
  'offline.preview',
]

export type OnQrCode = (qrCode: string, time: number, limit: number) => Promise<void>
export type OnNotification = (text: string, important: boolean) => Promise<void>
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type OnDisconnected = (phone: string, payload: any) => Promise<void>
export type OnNewLogin = (phone: string) => Promise<void>
export type OnReconnect = (time: number) => Promise<void>

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
  (_keys: WAMessageKey[]): Promise<boolean>
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

export interface logout {
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
  onReconnect,
  onNewLogin,
  attempts = Infinity,
  time,
  config = defaultConfig,
}: {
  phone: string
  store: Store
  onQrCode: OnQrCode
  onNotification: OnNotification
  onDisconnected: OnDisconnected
  onReconnect: OnReconnect
  onNewLogin: OnNewLogin
  attempts: number
  time: number
  config: Partial<Config>
}) => {
  let sock: WASocket | undefined = undefined
  const msgRetryCounterCache = new NodeCache()
  const { dataStore, state, saveCreds, sessionStore } = store
  let connectingTimeout

  const status: Status = {
    attempt: time,
  }

  const onConnectionUpdate = async (event: Partial<ConnectionState>) => {
    logger.debug('onConnectionUpdate ==> %s %s', phone, JSON.stringify(event))
    if (event.qr) {
      if (status.attempt > attempts) {
        const message =  t('attempts_exceeded', attempts)
        logger.debug(message)
        await onNotification(message, true)
        status.attempt = 1
        return logout()
      } else {
        logger.debug('QRCode generate... %s of %s', status.attempt, attempts)
        return onQrCode(event.qr, status.attempt++, attempts)
      }
    }

    if (event.isNewLogin) {
      await onNewLogin(phone)
      await sessionStore.setStatus(phone, 'online')
    }

    if (event.receivedPendingNotifications) {
      await onNotification(t('received_pending_notifications'), true)
    }

    if (event.isOnline) {
      await sessionStore.setStatus(phone, 'online')
      await onNotification(t('online_session'), true)
    }

    switch (event.connection) {
      case 'open':
        await onOpen()
        break

      case 'close':
        await onClose(event)
        break

      case 'connecting':
        await onConnecting()
        break
    }
  }

  const verifyConnectingTimeout = async () => {
    if (connectingTimeout) {
      return
    }
    logger.info(`Connecting ${phone} set timeout to ${CONNECTING_TIMEOUT_MS} ms`)
    if (await sessionStore.isStatusConnecting(phone)) {
      connectingTimeout = setTimeout(async () => {
        if (await sessionStore.isStatusConnecting(phone)) {
          connectingTimeout = null
          const message = t('connection_timed_out', phone, CONNECTING_TIMEOUT_MS)
          await onNotification(message, false)
          logger.warn(message)
          await onDisconnected(phone, {})
        }
      }, CONNECTING_TIMEOUT_MS)
    } else {
      connectingTimeout = null
    }
  }

  const onConnecting = async () => {
    await sessionStore.setStatus(phone, 'connecting')
    const message = t('connecting')
    await onNotification(message, false)
    logger.info(message)
    return verifyConnectingTimeout()
  }

  const onOpen = async () => {
    status.attempt = 1
    await sessionStore.setStatus(phone, 'online')
    logger.info(`${phone} connected`)
    const { version } = await fetchLatestBaileysVersion()
    const message = t('connected', phone, WHATSAPP_VERSION.join('.'), version.join('.'), new Date().toUTCString())
    await onNotification(message, false)
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const onClose = async (payload: any) => {
    if (await sessionStore.isStatusOffline(phone)) {
      logger.warn('Already Offline %s', phone)
      sock = undefined
      return
    }
    if (await sessionStore.isStatusDisconnect(phone)) {
      logger.warn('Already Disconnected %s', phone)
      sock = undefined
      return
    }
    const { lastDisconnect } = payload
    const statusCode = lastDisconnect?.error?.output?.statusCode
    logger.info(`${phone} disconnected with status: ${statusCode}`)
    if ([DisconnectReason.loggedOut, DisconnectReason.badSession, DisconnectReason.forbidden].includes(statusCode)) {
      status.attempt = 1
      if (!(await sessionStore.isStatusConnecting(phone))) {
        const message = t('removed')
        await onNotification(message, true)
      }
      await logout()
      return onDisconnected(phone, payload)
    } else if (statusCode === DisconnectReason.connectionReplaced) {
      await close()
      const message = t('unique')
      return onNotification(message, true)
    }
    if (status.attempt == 1) {
      const detail = lastDisconnect?.error?.output?.payload?.error
      const message = t('closed', statusCode, detail)
      await onNotification(message, true)
    }
    return reconnect()
  }

  const getMessage = async (key: proto.IMessageKey): Promise<proto.IMessage | undefined> => {
    const { remoteJid, id } = key
    logger.debug('load message for jid %s id %s', remoteJid, id)
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    const message = await dataStore.loadMessage(remoteJid!, id!)
    return message?.message || undefined
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

  const event = <T extends keyof BaileysEventMap>(event: T, callback: (arg: BaileysEventMap[T]) => void) => {
    logger.info('Subscribe %s event: %s sock: %s', phone, event, sock?.user?.id)
    return sock?.ev?.on(event, callback)
  }

  const reconnect = async () => {
    logger.info(`${phone} reconnecting`, status.attempt)
    if (status.attempt > attempts) {
      const message =  t('attempts_exceeded', attempts)
      await onNotification(message, true)
      status.attempt = 1
      return close()
    } else {
      const message =  t('connecting_attemps', status.attempt, attempts)
      await onNotification(message, false)
      await close()
      return onReconnect(status.attempt++)
    }
  }

  const close = async () => {
    logger.info(`${phone} close`)
    EVENTS.forEach((e: any) => {
      try {
        sock?.ev?.removeAllListeners(e)
      } catch (error) {
        logger.error(`Error on removeAllListeners from ${e}`, error)
      }
    })
    const webSocket = sock?.ws['socket'] || {}
    // WebSocket.CONNECTING (0)
    // WebSocket.OPEN (1)
    // WebSocket.CLOSING (2)
    // WebSocket.CLOSED (3)
    if (`${webSocket['readyState']}` == '1'){
      if (await sessionStore.isStatusConnecting(phone) || await sessionStore.isStatusOnline(phone)) {
        try {
          await sock?.end(undefined)
        } catch (e) {
          logger.error(`Error sock end`, e)
        }
        try {
          await sock?.ws?.close()
        } catch (e) {
          logger.error(`Error on sock ws close`, e)
        }
      }
    }
    sock = undefined
    await sessionStore.setStatus(phone, 'offline')
  }

  const logout = async () => {
    logger.info(`${phone} logout`)
    try {
      return sock && await sock.logout()
    } catch (error) {
      logger.error(`Error on remove session ${phone}: ${error.message}`,)  
      // ignore de unique error if already diconected session
    } finally {
      logger.info(`${phone} destroyed`)
      await dataStore.cleanSession()
    }
    await close()
    await sessionStore.setStatus(phone, 'disconnected')
  }

  const exists: exists = async (localPhone: string) => {
    try {
      await validateStatus()
    } catch (error) {
      if (localPhone == phone) {
        logger.info(`${localPhone} is the phone connection ${phone}`)
      } else {
        throw error
      }
    }

    return dataStore.loadJid(localPhone, sock!)
  }

  const validateStatus = async () => {
    if (await sessionStore.isStatusConnecting(phone)) {
      await verifyConnectingTimeout()
      throw new SendError(5, t('connecting_session'))
    } else if (await sessionStore.isStatusDisconnect(phone) || !sock) {
      throw new SendError(3, t('disconnected_session'))
    } else if (await sessionStore.isStatusOffline(phone)) {
      throw new SendError(12, t('offline_session'))
    }
    if (connectingTimeout) {
      clearTimeout(connectingTimeout)
      connectingTimeout = null
    }
  }

  const send: sendMessage = async (
    to: string,
    message: AnyMessageContent,
    options: { composing: boolean; quoted: boolean | undefined } = { composing: false, quoted: undefined },
  ) => {
    await validateStatus()
    const id =  isIndividualJid(to) ? await exists(to) : to
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
      logger.debug('Send baileys from %s to %s -> %s', phone, id, JSON.stringify(message))
      return sock?.sendMessage(id, message, opts)
    }
    if (!isValidPhoneNumber(to)) {
      throw new SendError(7, t('invalid_phone_number', to))
    }
    throw new SendError(2, t('without_whatsapp', to))
  }

  const read: readMessages = async (keys: WAMessageKey[]) => {
    await validateStatus()

    await sock?.readMessages(keys)
    return true
  }

  if (config.autoRestartMs) {
    const message = t('auto_restart', config.autoRestartMs)
    await onNotification(message, true)
    setInterval(reconnect, config.autoRestartMs)
  }

  const rejectCall: rejectCall = async (callId: string, callFrom: string) => {
    await validateStatus()

    return sock?.rejectCall(callId, callFrom)
  }

  const fetchImageUrl: fetchImageUrl = async (jid: string) => {
    return dataStore.loadImageUrl(jid, sock!)
  }

  const fetchGroupMetadata: fetchGroupMetadata = async (jid: string) => {
    return dataStore.loadGroupMetada(jid, sock!)
  }

  const connect = async () => {
    if (await sessionStore.isStatusConnecting(phone)) {
      logger.warn('Already Connecting %s', phone)
      return
    }
    if (await sessionStore.isStatusOnline(phone)) {
      logger.warn('Already Connected %s', phone)
      return
    }
    if (await sessionStore.isStatusBlockedAndVerify(phone)) {
      logger.warn('Blocked %s', phone)
      return
    }
    logger.debug('Connecting %s', phone)

    const browser: WABrowserDescription = config.ignoreHistoryMessages ? DEFAULT_BROWSER as WABrowserDescription : Browsers.windows('Desktop')

    const loggerBaileys = MAIN_LOGGER.child({})
    logger.level = config.logLevel as Level
    loggerBaileys.level = (LOG_LEVEL) as Level

    let agent
    let fetchAgent
    if (config.proxyUrl) {
      agent = new SocksProxyAgent(config.proxyUrl)
      fetchAgent = new HttpsProxyAgent(config.proxyUrl)
    }

    try {
      sock = makeWASocket({
        auth: state,
        printQRInTerminal: config.connectionType == 'qrcode',
        browser,
        msgRetryCounterCache,
        syncFullHistory: !config.ignoreHistoryMessages,
        logger: loggerBaileys,
        getMessage,
        shouldIgnoreJid: config.shouldIgnoreJid,
        retryRequestDelayMs: config.retryRequestDelayMs,
        patchMessageBeforeSending,
        agent,
        fetchAgent,
        version: WHATSAPP_VERSION,
      })
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (error: any) {
      if (error && error.isBoom && !error.isServer) {
        await onClose({ lastDisconnect: { error } })
      } else {
        logger.error('Baileys Socket error: %s %s', error, error.stack)
        const message = t('error', error.message)
        await onNotification(message, true)
        throw error
      }
    }
    if (sock) {
      dataStore.bind(sock.ev)
      event('creds.update', saveCreds)
      event('connection.update', onConnectionUpdate)

      if (config.connectionType == 'pairing_code' && !sock?.authState?.creds?.registered) {
        logger.info(`Requesting pairing code ${phone} `)
        const code = await sock?.requestPairingCode(phone)
        const message = `Open your WhatsApp, go to: Connected Devices > Connect a new Device > Connect using phone number > And put your connection code > ${code}!`
        await onNotification(message, true)
      }

      if (config.wavoipToken) {
        useVoiceCallsBaileys(config.wavoipToken, sock as any, 'close', true)
      }
    }
  }

  await connect()

  return { event, status, send, read, rejectCall, fetchImageUrl, fetchGroupMetadata, exists, close, logout }
}
