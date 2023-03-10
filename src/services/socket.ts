import makeWASocket, {
  DisconnectReason,
  WASocket,
  isJidStatusBroadcast,
  UserFacingSocketConfig,
  ConnectionState,
  WAMessage,
  fetchLatestBaileysVersion,
  delay,
  WABrowserDescription,
} from '@adiwajshing/baileys'
import { Boom } from '@hapi/boom'
import { Client } from './client'
import { Store } from './store'
import { DataStore } from './data_store'
import { v1 as uuid } from 'uuid'
import QRCode from 'qrcode'
import { release } from 'os'
import { phoneNumberToJid } from './transformer'
const counts: Map<string, number> = new Map()
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
  await client.receive([waMessage], false)
  if ((counts.get(client.phone) || 0) >= max) {
    counts.delete(client.phone)
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

export declare type Connection = {
  sock: WASocket
  firstConnection: boolean
}

export const connect = async ({ store, client }: { store: Store; client: Client }): Promise<Connection> => {
  let firstConnection = false
  const { state, saveCreds, dataStore } = store
  const browser: WABrowserDescription = [release(), 'Baileys', 'Cloud API']
  const config: UserFacingSocketConfig = {
    printQRInTerminal: true,
    auth: state,
    shouldIgnoreJid: (jid: string) => isJidStatusBroadcast(jid),
    browser,
    defaultQueryTimeoutMs: 60_000,
    qrTimeout: 60_000,
  }
  const sock = await makeWASocket(config)
  dataStore.bind(sock.ev)
  sock.ev.on('creds.update', saveCreds)
  const listener = (messages: object[], update = true) => client.receive(messages, update)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  sock.ev.on('messages.upsert', async (payload: any) => {
    console.debug('messages.upsert', client.phone, JSON.stringify(payload, null, ' '))
    listener(payload.messages, false)
  })
  sock.ev.on('messages.update', (messages: object[]) => {
    console.debug('messages.upsert', client.phone, JSON.stringify(messages, null, ' '))
    listener(messages)
  })
  sock.ev.on('message-receipt.update', (messages: object[]) => {
    console.debug('message-receipt.update', client.phone, JSON.stringify(messages, null, ' '))
    listener(messages)
  })
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  sock.ev.on('messages.delete', (update: any) => {
    console.debug('messages.delete', client.phone, JSON.stringify(update, null, ' '))
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
          await client.disconnect()
          return connect({ store, client })
        } else {
          const message = `The session is removed in Whatsapp App`
          await client.sendStatus(message)
          await disconnectSock(sock)
          try {
            await sock?.logout()
          } catch (error) {
            console.error('Error on logout', error)
          }
          await dataStore.cleanSession()
          await client.disconnect()
        }
      } else if (connection === 'open') {
        const { version, isLatest } = await fetchLatestBaileysVersion()
        const message = `Connnected using Whatsapp Version v${version.join('.')}, is latest? ${isLatest}`
        await client.sendStatus(message)
        const connection: Connection = {
          sock: sock,
          firstConnection,
        }
        delay(5_000)
        if (firstConnection) {
          firstConnection = false
          const message = `Successful connect, restarting socket!`
          await client.sendStatus(message)
          await disconnectSock(sock)
          await client.disconnect()
          return reject(connection)
        } else {
          return resolve(connection)
        }
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
      } else if (update.isNewLogin) {
        firstConnection = true
        const message = `Please be careful, the http endpoint is unprotected and if it is exposed in the network, someone else can send message as you!`
        await client.sendStatus(message)
      } else {
        console.debug('connection.update', update)
      }
    })
  })
}
