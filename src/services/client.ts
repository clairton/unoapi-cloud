import { AnyMessageContent, WAMessageKey, WASocket } from '@adiwajshing/baileys'
import { Outgoing } from './outgoing'
import { store } from './store'
import { connect } from './socket'
import { toBaileysMessageContent, toBaileysJid, toBaileysMessageKey } from './transformer'
import { v1 as uuid } from 'uuid'

export class Client {
  public phone: string
  private store: store
  private sock: WASocket | undefined
  private outgoing: Outgoing

  constructor(phone: string, store: store, outgoing: Outgoing) {
    this.phone = phone
    this.store = store
    this.outgoing = outgoing
  }

  async connect() {
    this.sock = await connect({ store: this.store, client: this })
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
    if (!this.sock) {
      throw `Connect first calling connect`
    }
    const { status, type, to } = payload
    if (status) {
      if (['sent', 'delivered', 'failed', 'progress', 'read'].includes(status)) {
        if (status == 'read') {
          const key: WAMessageKey = toBaileysMessageKey(this.phone, payload)
          await this.sock?.readMessages([key])
        }
        return { success: true }
      } else {
        throw new Error(`Unknow message status ${status}`)
      }
    } else if (type) {
      if (['text', 'image', 'audio', 'document', 'video', 'template'].includes(type)) {
        const jid: string = toBaileysJid(to)
        const content: AnyMessageContent = toBaileysMessageContent(payload)
        const response = await this.sock?.sendMessage(jid, content)
        if (response) {
          const key = response.key
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
        }
      } else {
        throw new Error(`Unknow message type ${type}`)
      }
    }
  }

  async receive(messages: object[]) {
    return this.outgoing.sendMany(this.phone, messages)
  }
}
