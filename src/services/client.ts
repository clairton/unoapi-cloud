const clients: Map<string, Client> = new Map()
import makeWASocket, { DisconnectReason, WASocket, AnyMessageContent, WAMessageKey } from '@adiwajshing/baileys'
import { Boom } from '@hapi/boom'
import { toBaileysMessageContent, toBaileysJid, toBaileysMessageKey } from './transformer'

const connectToWhatsApp = async () => {
  const sock: WASocket = makeWASocket({
    // can provide additional config here
    printQRInTerminal: true,
  })
  sock.ev.on('connection.update', (update) => {
    const { connection, lastDisconnect } = update
    if (connection === 'close') {
      const shouldReconnect = (lastDisconnect.error as Boom)?.output?.statusCode !== DisconnectReason.loggedOut
      console.log('connection closed due to ', lastDisconnect.error, ', reconnecting ', shouldReconnect)
      // reconnect if not logged out
      if (shouldReconnect) {
        return connectToWhatsApp()
      }
    } else if (connection === 'open') {
      console.log('opened connection')
      return sock
    }
  })
  sock.ev.on('messages.upsert', (m) => {})
}
// run in main file
connectToWhatsApp()

export const getClient = async (phone: string) => {
  if (!clients.has(phone)) {
    const client = new Client(phone)
    await client.connect()
    clients.set(phone, client)
  }
  return clients.get(phone)
}

class Client {
  private phone: string
  private sock: any // WASocket

  constructor(phone: string) {
    this.phone = phone
  }

  async connect() {
    this.sock = await connectToWhatsApp()
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

  async receive() {
    return true
  }
}
