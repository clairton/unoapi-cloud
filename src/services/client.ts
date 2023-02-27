const clients: Map<string, Client> = new Map()
import { AnyMessageContent, WAMessageKey } from '@adiwajshing/baileys'
import { Outgoing } from './outgoing'
import { connect } from './socket'
import { toBaileysMessageContent, toBaileysJid, toBaileysMessageKey } from './transformer'
import { v1 as uuid } from 'uuid'

export const getClient = async (phone: string, store: any, outgoing: Outgoing) => {
  if (!clients.has(phone)) {
    const client = new Client(phone, store, outgoing)
    await client.connect()
    clients.set(phone, client)
  }
  return clients.get(phone)
}

export class Client {
  public phone: string
  private store: any // Store
  private sock: any // WASocket
  private outgoing: Outgoing

  constructor(phone: string, store: any, outgoing: Outgoing) {
    this.phone = phone
    this.store = store
    this.outgoing = outgoing
  }

  async connect() {
    this.sock = await connect(this.store, this)
  }

  async sendStatus(text: string) {
    const payload = {
      key: {
        remoteJid: toBaileysJid(this.phone),
        id: uuid(),
      },
      message: {
        conversation: text,
      },
      messageTimestamp: new Date().getTime(),
    }
    return this.outgoing.sendOne(this.phone, payload)
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
        const { key } = await this.sock.sendMessage(jid, content)
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

  async receive(messages: any[]) {
    return this.outgoing.sendMany(this.phone, messages)
  }
}
