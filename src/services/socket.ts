import makeWASocket, {
  DisconnectReason,
  WASocket,
  isJidBroadcast,
  UserFacingSocketConfig,
  ConnectionState,
  WAMessage,
  fetchLatestBaileysVersion,
} from '@adiwajshing/baileys'
import { Boom } from '@hapi/boom'
import { Client } from './client'
import { store } from './store'
import { DataStore } from './data_store'
import { v1 as uuid } from 'uuid'
import QRCode from 'qrcode'
import { phoneNumberToJid, isIndividualJid, getMessageType, TYPE_MESSAGES_TO_PROCESS_FILE } from './transformer'
const counts: Map<string, number> = new Map()
const connectings: Map<string, number> = new Map()
const max = 6

const onQrCode = async (client: Client, dataStore: DataStore, qrCode: string) => {
  counts.set(client.phone, (counts.get(client.phone) || 0) + 1)
  console.debug(`Received qrcode ${qrCode}`)
  const messageTimestamp = new Date().getTime()
  const mediaKey = uuid()
  const qrCodeUrl = await QRCode.toDataURL(qrCode)
  const remoteJid = phoneNumberToJid(client.phone)
  const waMessageKey = {
    remoteJid,
    id: mediaKey,
  }
  const waMessage: WAMessage = {
    key: waMessageKey,
    message: {
      imageMessage: {
        url: qrCodeUrl,
        mimetype: 'image/png',
        fileLength: qrCode.length,
        caption: `Please, read the QR Code to connect on Whatsapp Web, attempt ${counts.get(client.phone)} of ${max}`,
      },
    },
    messageTimestamp,
  }
  await dataStore.setMessage(remoteJid, waMessage)
  await dataStore.setKey(mediaKey, waMessageKey)
  await dataStore.saveMedia(waMessage)
  delete waMessage.message?.imageMessage?.url
  await client.receive([waMessage])
  if ((counts.get(client.phone) || 0) >= max) {
    counts.delete(client.phone)
    connectings.delete(client.phone)
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
      } catch (error) {}
    })
    try {
      await sock?.ws?.close()
    } catch (error) {}
    try {
      await sock?.logout()
    } catch (error) {}
  }
}

export declare type Connection = {
  sock: WASocket
  dataStore: DataStore
}

export const connect = async ({ store, client }: { store: store; client: Client }): Promise<Connection> => {
  const { state, saveCreds, dataStore } = await store(client.phone)
  const config: UserFacingSocketConfig = {
    printQRInTerminal: true,
    auth: state,
    shouldIgnoreJid: (jid: string) => isJidBroadcast(jid),
    browser: ['Baileys', 'Chrome', 'Cloud API'],
  }
  const sock = await makeWASocket(config)
  dataStore.bind(sock.ev)
  sock.ev.on('creds.update', saveCreds)
  const listener = (messages: object[]) => client.receive(messages)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  sock.ev.on('messages.upsert', async (payload: any) => {
    const messages = await Promise.all(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      payload.messages.map(async (m: any) => {
        const { key } = m
        if (!isIndividualJid(key.remoteJid)) {
          m.groupMetadata = dataStore.groupMetadata[key.remoteJid] || (await dataStore.fetchGroupMetadata(key.remoteJid, sock))
        }
        const messageType = getMessageType(m)
        if (messageType && TYPE_MESSAGES_TO_PROCESS_FILE.includes(messageType)) {
          const i: WAMessage = m as WAMessage
          dataStore.saveMedia(i)
        }
        return m
      }),
    )
    listener(messages)
  })
  sock.ev.on('messages.update', listener)
  sock.ev.on('message-receipt.update', listener)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  sock.ev.on('messages.delete', (update: any) => {
    const keys = update.keys || []
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const payload = keys.map((key: any) => {
      return { key, update: { status: 'DELETED' } }
    })
    listener(payload)
  })
  return new Promise<Connection>((resolve, reject) => {
    return sock.ev.on('connection.update', async (update: Partial<ConnectionState>) => {
      const { connection, lastDisconnect } = update
      if (connection === 'close' && lastDisconnect) {
        const statusCode = (lastDisconnect.error as Boom)?.output?.statusCode
        const shouldReconnect = statusCode !== DisconnectReason.loggedOut
        console.log('connection closed due to ', lastDisconnect.error, ', reconnecting ', shouldReconnect)
        // reconnect if not logged out
        if (shouldReconnect) {
          await disconnectSock(sock)
          return connect({ store, client })
        } else if (statusCode === DisconnectReason.loggedOut) {
          const message = `The session is removed in Whatsapp App`
          await client.sendStatus(message)
          await disconnectSock(sock)
          await dataStore.cleanSession()
        }
      } else if (connection === 'open') {
        const { version, isLatest } = await fetchLatestBaileysVersion()
        const message = `Connnected using Whatsapp Version v${version.join('.')}, is latest? ${isLatest}`
        await client.sendStatus(message)
      } else if (update.qr) {
        if (!(await onQrCode(client, dataStore, update.qr))) {
          await disconnectSock(sock)
          const message = `The ${max} times of generate qrcode is exceded!`
          await client.sendStatus(message)
          return reject(message)
        }
      } else if (connection === 'connecting') {
        const message = `Connnecting...`
        await client.sendStatus(message)
      } else if (update.isOnline) {
        const connection: Connection = {
          sock: sock,
          dataStore: dataStore,
        }
        return resolve(connection)
      } else {
        console.debug('connection.update', update)
      }
    })
  })
}
