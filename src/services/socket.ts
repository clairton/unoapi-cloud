import makeWASocket, {
  DisconnectReason,
  WASocket,
  UserFacingSocketConfig,
  ConnectionState,
  WAMessage,
  fetchLatestBaileysVersion,
  WABrowserDescription,
  MessageRetryMap,
} from '@adiwajshing/baileys'

import logger from '@adiwajshing/baileys/lib/Utils/logger'
logger.level = process.env.LOG_LEVEL || (process.env.NODE_ENV === 'development' ? 'debug' : 'error')

import { Boom } from '@hapi/boom'
import { Client, ClientConfig } from './client'
import { Store } from './store'
import { DataStore } from './data_store'
import { v1 as uuid } from 'uuid'
import QRCode from 'qrcode'
import { release } from 'os'
import { phoneNumberToJid } from './transformer'
import { Outgoing } from './outgoing'
import { Incoming } from './incoming'
const counts: Map<string, number> = new Map()
const calls = new Map<string, boolean>()
const max = 6

const onQrCode = async (phone: string, outgoing: Outgoing, dataStore: DataStore, qrCode: string) => {
  counts.set(phone, (counts.get(phone) || 0) + 1)
  console.debug(`Received qrcode ${qrCode}`)
  const messageTimestamp = new Date().getTime()
  const id = uuid()
  const qrCodeUrl = await QRCode.toDataURL(qrCode)
  const remoteJid = phoneNumberToJid(phone)
  const waMessageKey = {
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
        caption: `Please, read the QR Code to connect on Whatsapp Web, attempt ${counts.get(phone)} of ${max}`,
      },
    },
    messageTimestamp,
  }
  await dataStore.setMessage(remoteJid, waMessage)
  await dataStore.setKey(id, waMessageKey)
  await outgoing.sendOne(phone, waMessage)
  if ((counts.get(phone) || 0) >= max) {
    counts.delete(phone)
    return false
  }
  return true
}

const disconnectSock = async (sock: WASocket) => {
  if (sock) {
    const events = ['messages.delete', 'message-receipt.update', 'messages.update', 'messages.upsert', 'creds.update', 'connection.update']
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    events.forEach((key: any) => {
      try {
        sock?.ev?.removeAllListeners(key)
      } catch (error) {
        console.error('Error on %s sock.ev.removeAllListeners %s', key, error)
      }
    })
    try {
      await sock?.ws?.close()
    } catch (error) {
      console.error('Error on sock.ws.close', error)
    }
  }
}

export declare type Connection<T> = {
  sock: T
}

const sendStatus = (phone: string, outgoing: Outgoing, text: string) => {
  const payload = {
    key: {
      remoteJid: phoneNumberToJid(phone),
      id: uuid(),
    },
    message: {
      conversation: text,
    },
    messageTimestamp: new Date().getTime(),
  }
  return outgoing.sendOne(phone, payload)
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const receive = async (phone: string, outgoing: Outgoing, dataStore: DataStore, messages: any[], update = true) => {
  console.debug('Receives %s %s', update ? 'update(s)' : 'message(s)', messages.length)
  return outgoing.sendMany(phone, messages)
}

export const connect = async <T>({
  phone,
  incoming,
  outgoing,
  client,
  store,
  config,
}: {
  phone: string
  incoming: Incoming
  outgoing: Outgoing
  client: Client
  store: Store
  config: ClientConfig
}): Promise<Connection<T>> => {
  const { state, saveCreds, dataStore } = store
  const browser: WABrowserDescription = ['Unoapi Cloud', 'Chrome', release()]
  const msgRetryCounterMap: MessageRetryMap = {}
  const socketConfig: UserFacingSocketConfig = {
    printQRInTerminal: true,
    auth: state,
    browser,
    defaultQueryTimeoutMs: 60_000,
    qrTimeout: 60_000,
    msgRetryCounterMap,
    connectTimeoutMs: 5 * 60 * 1000,
    keepAliveIntervalMs: 10_000,
    logger,
  }
  const sock = await makeWASocket(socketConfig)
  dataStore.bind(sock.ev)

  sock.ev.on('creds.update', saveCreds)
  const listener = (messages: object[], update = true) => receive(phone, outgoing, store.dataStore, messages, update)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  sock.ev.on('messages.upsert', async (payload: any) => {
    console.debug('messages.upsert', phone, JSON.stringify(payload, null, ' '))
    listener(payload.messages, false)
  })
  sock.ev.on('messages.update', (messages: object[]) => {
    console.debug('messages.update', phone, JSON.stringify(messages, null, ' '))
    listener(messages)
  })
  sock.ev.on('message-receipt.update', (messages: object[]) => {
    console.debug('message-receipt.update', phone, JSON.stringify(messages, null, ' '))
    listener(messages)
  })
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  sock.ev.on('messages.delete', (update: any) => {
    console.debug('messages.delete', phone, JSON.stringify(update, null, ' '))
    const keys = update.keys || []
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const payload = keys.map((key: any) => {
      return { key, update: { status: 'DELETED' } }
    })
    listener(payload)
  })

  if (config.rejectCalls) {
    console.info('Config to reject calls')
    sock.ev.on('call', async (events) => {
      for (let i = 0; i < events.length; i++) {
        const { from, id, status } = events[i]
        if (status == 'ringing' && !calls.has(from)) {
          await incoming.send(from, { text: config.rejectCalls })
          if (config.webhookCallsMessage) {
            const message = {
              key: {
                fromMe: false,
                id: uuid(),
                remoteJid: from,
              },
              message: {
                conversation: config.webhookCallsMessage,
              },
            }
            await dataStore.setMessage(message.key.id, message)
            await outgoing.sendOne(phone, message)
          }
          await sock.rejectCall(id, from)
          calls.set(from, true)
        } else if (['timeout', 'reject', 'accept'].includes(status)) {
          calls.delete(from)
        }
      }
    })
  }

  sock.ev.on('connection.update', async (update: Partial<ConnectionState>) => {
    const { connection, lastDisconnect } = update
    if (connection === 'close' && lastDisconnect) {
      const statusCode = (lastDisconnect.error as Boom)?.output?.statusCode
      const shouldReconnect = statusCode !== DisconnectReason.loggedOut
      console.log('connection closed due to ', lastDisconnect.error, ', reconnecting ', shouldReconnect)
      // reconnect if not logged out
      if (shouldReconnect) {
        await disconnectSock(sock)
        try {
          setTimeout(() => {
            client.connect()
          }, 1_000)
        } catch (error) {}
      } else {
        const message = `The session is removed in Whatsapp App, send a message here to reconnect!`
        await sendStatus(phone, outgoing, message)
        await disconnectSock(sock)
        try {
          await sock?.logout()
        } catch (error) {
          console.error('Error on logout', error)
        }
        await dataStore.cleanSession()
        await client.disconnect()
      }
    } else if (connection === 'open' && config.sendConnectionStatus) {
      const { version, isLatest } = await fetchLatestBaileysVersion()
      const message = `Connnected using Whatsapp Version v${version.join('.')}, is latest? ${isLatest}`
      await sendStatus(phone, outgoing, message)
    } else if (update.qr) {
      if (!(await onQrCode(phone, outgoing, dataStore, update.qr))) {
        await disconnectSock(sock)
        const message = `The ${max} times of generate qrcode is exceded!`
        await sendStatus(phone, outgoing, message)
        throw message
      }
    } else if (connection === 'connecting' && config.sendConnectionStatus) {
      const message = `Connnecting...`
      await sendStatus(phone, outgoing, message)
    } else if (update.isNewLogin) {
      const message = `Please be careful, the http endpoint is unprotected and if it is exposed in the network, someone else can send message as you!`
      await sendStatus(phone, outgoing, message)
    } else {
      console.debug('connection.update', update)
    }
  })
  const connection: Connection<T> = {
    sock: sock as T,
  }
  return connection
}
