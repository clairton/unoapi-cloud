import makeWASocket, { DisconnectReason, WASocket, isJidBroadcast, BaileysEventEmitter, UserFacingSocketConfig } from '@adiwajshing/baileys'
import { Boom } from '@hapi/boom'
import { Client } from './client'
import { store } from './store'
import { v1 as uuid } from 'uuid'
import { toBaileysJid } from './transformer'
const counts: Map<string, number> = new Map()
const connectings: Map<string, number> = new Map()
const max = 6

const onQrCode = async (client: Client, qrCode: string) => {
  counts.set(client.phone, (counts.get(client.phone) || 0) + 1)
  console.debug(`Received qrcode ${qrCode}`)
  const messageTimestamp = new Date().getTime()
  const mediaKey = uuid()
  await client.send({
    key: {
      remoteJid: toBaileysJid(client.phone),
      id: mediaKey,
    },
    message: {
      imageMessage: {
        url: qrCode,
        mimetype: 'image/png',
        fileName: `qrcode-unoapi-${messageTimestamp}.png`,
        mediaKey,
        fileLength: qrCode.length,
        caption: `Please, read the QR Code to connect on Whatsapp Web, attempt ${counts.get(client.phone)} of ${max}`,
      },
    },
    messageTimestamp,
  })
  if (counts.get(client.phone) || 0 >= max) {
    counts.delete(client.phone)
    connectings.delete(client.phone)
    return false
  }
  return true
}

export const connect = async ({ store, client }: { store: store; client: Client }) => {
  const { state, saveCreds } = await store()
  const config: UserFacingSocketConfig = {
    printQRInTerminal: true,
    auth: state,
    shouldIgnoreJid: (jid: string) => isJidBroadcast(jid),
  }
  const sock = await makeWASocket(config)
  sock.ev.on('creds.update', saveCreds)
  const listener = (messages: any[]) => client.receive(messages)
  sock.ev.on('messages.upsert', (payload: any) => listener(payload.messages))
  sock.ev.on('messages.update', listener)
  sock.ev.on('message-receipt.update', listener)
  sock.ev.on('messages.delete', (update: any) => {
    const keys = update.keys || []
    const payload = keys.map((key: any) => {
      return { key, update: { status: 'DELETED' } }
    })
    listener(payload)
  })
  return new Promise<WASocket>((resolve, reject) => {
    sock.ev.on('connection.update', async (update: any) => {
      const { connection, lastDisconnect } = update
      if (connection === 'close') {
        const shouldReconnect = (lastDisconnect.error as Boom)?.output?.statusCode !== DisconnectReason.loggedOut
        console.log('connection closed due to ', lastDisconnect.error, ', reconnecting ', shouldReconnect)
        // reconnect if not logged out
        if (shouldReconnect) {
          return connect({ store, client })
        }
      } else if (connection === 'open') {
        return resolve(sock)
      } else if (update.qr) {
        if (!(await onQrCode(client, update.qr))) {
          const events = ['messages.delete', 'message-receipt.update', 'messages.update', 'messages.upsert', 'creds.update', 'connection.update']
          events.forEach((key: any) => sock?.ev?.removeAllListeners(key))
          await sock?.ws?.close()
          await sock?.logout()
          const message = `The ${max} times of generate qrcide is exceded!`
          await client.sendStatus(message)
          return reject(message)
        }
      }
    })
  })
}
