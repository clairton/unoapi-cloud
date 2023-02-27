const clients: Map<string, Client> = new Map()
import makeWASocket, { DisconnectReason, WASocket, AnyMessageContent, WAMessageKey, downloadMediaMessage } from '@adiwajshing/baileys'
import { Boom } from '@hapi/boom'
import { Outgoing } from './outgoing'
import { toBaileysMessageContent, toBaileysJid, toBaileysMessageKey } from './transformer'

const connectToWhatsApp = async (store: any, client: Client) => {
  const { state, saveCreds } = await store()
  const config: any = {
    // can provide additional config here
    printQRInTerminal: true,
    auth: state,
  }
  const sock: WASocket = makeWASocket(config)
  sock.ev.on('creds.update', saveCreds)
  sock.ev.on('connection.update', (update: any) => {
    const { connection, lastDisconnect } = update
    if (connection === 'close') {
      const shouldReconnect = (lastDisconnect.error as Boom)?.output?.statusCode !== DisconnectReason.loggedOut
      console.log('connection closed due to ', lastDisconnect.error, ', reconnecting ', shouldReconnect)
      // reconnect if not logged out
      if (shouldReconnect) {
        return connectToWhatsApp(store, client)
      }
    } else if (connection === 'open') {
      console.log('opened connection')
      return sock
    }
  })
  sock.ev.on('messages.upsert', (messages) => {
    client.receive(messages)
  })
}

export const getClient = async (phone: string, store: any, outgoing: Outgoing) => {
  if (!clients.has(phone)) {
    const client = new Client(phone, store, outgoing)
    await client.connect()
    clients.set(phone, client)
  }
  return clients.get(phone)
}

export class Client {
  private phone: string
  private store: any // Store
  private sock: any // WASocket
  private outgoing: Outgoing

  constructor(phone: string, store: any, outgoing: Outgoing) {
    this.phone = phone
    this.store = store
    this.outgoing = outgoing
  }

  async connect() {
    this.sock = await connectToWhatsApp(this.store, this)
  }

  async send(payload: any) {
    const { status, type, to } = payload
    if (status) {
      if (['sent', 'delivered', 'failed', 'progress', 'read'].includes(status)) {
        if (status == 'read') {
          const key: WAMessageKey = toBaileysMessageKey(this.phone, payload)
          this.sock.readMessages([key])
        }
        return { success: true }
      } else {
        throw new Error(`Unknow message status ${status}`)
      }
    } else if (type) {
      if (['text', 'image', 'audio', 'document', 'video', 'template'].includes(type)) {
        const jid: string = toBaileysJid(to)
        const content: AnyMessageContent = toBaileysMessageContent(payload)
        const { key } = this.sock.sendMessage(jid, content)
        return {
          messaging_product: 'whatsapp',
          contacts: [
            {
              wa_id: to,
            },
          ],
          messages: [
            {
              id: key.id,
            },
          ],
        }
      } else {
        throw new Error(`Unknow message type ${type}`)
      }
    }
  }

  async receive(messages: [any]) {
    return this.outgoing.send(this.phone, messages)
  }
}
