import makeWASocket, { DisconnectReason, WASocket, BaileysEventMap } from '@adiwajshing/baileys'
import { Boom } from '@hapi/boom'
import { Client } from './client'
import { v1 as uuid } from 'uuid'
import { toBaileysJid } from './transformer'
const counts: any = {}
const connectings: any = {}
const max = 6

const onQrCode = async (client: Client, qrCode: any) => {
  if (!counts[client.phone]) {
    counts[client.phone] = 0
  }
  counts[client.phone]++
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
        caption: `Leia o QR Code para conectar ao Whatsapp Web, tentativa ${counts[client.phone]} de ${max}`,
      },
    },
    messageTimestamp,
  })
  if (counts[client.phone] >= max) {
    delete counts[client.phone]
    delete connectings[client.phone]
    return false
  }
  return true
}

export const connect = async (store: any, client: Client) => {
  const { state, saveCreds } = await store()
  const config: any = {
    // can provide additional config here
    printQRInTerminal: true,
    auth: state,
  }
  const sock: WASocket = makeWASocket(config)
  sock.ev.on('creds.update', saveCreds)
  sock.ev.on('connection.update', async (update: any) => {
    const { connection, lastDisconnect } = update
    if (connection === 'close') {
      const shouldReconnect = (lastDisconnect.error as Boom)?.output?.statusCode !== DisconnectReason.loggedOut
      console.log('connection closed due to ', lastDisconnect.error, ', reconnecting ', shouldReconnect)
      // reconnect if not logged out
      if (shouldReconnect) {
        return connect(store, client)
      }
    } else if (connection === 'open') {
      console.log('opened connection')
      return sock
    } else if (update.qr) {
      if (!(await onQrCode(client, update.qr))) {
        const events = ['messages.delete', 'message-receipt.update', 'messages.update', 'messages.upsert', 'creds.update', 'connection.update']
        events.forEach((key: any) => sock?.ev?.removeAllListeners(key))
        await sock?.ws?.close()
        const message = `The ${max} times of generate qrcide is exceded!`
        await client.sendStatus(message)
        throw new Error(message) // @TODO
      }
    }
  })
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
}
