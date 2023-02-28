import { AnyMessageContent, WAMessageKey, WASocket } from '@adiwajshing/baileys'
import { Outgoing } from './outgoing'
import { store } from './store'
import { connect } from './socket'
import { Client } from './client'
import { toBaileysMessageContent, toBaileysJid, toBaileysMessageKey } from './transformer'
import { v1 as uuid } from 'uuid'

export class ClientBaileys implements Client {
  public phone: string
  private sock: WASocket | undefined
  private outgoing: Outgoing

  constructor(phone: string, outgoing: Outgoing) {
    this.phone = phone
    this.outgoing = outgoing
  }

  async connect(store: store) {
    this.sock = await connect({ store, client: this })
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
    if (!this.sock) {
      const message = 'Please, read the QRCode!'
      await this.sendStatus(message)
      const id = uuid()
      return {
        messaging_product: 'whatsapp',
        contacts: [
          {
            wa_id: to,
          },
        ],
        messages: [
          {
            id,
          },
        ],
        statuses: [
          {
            id,
            recipient_id: to,
            status: 'failed',
            timestamp: Math.floor(Date.now() / 1000),
            errors: [
              {
                code: 1,
                title: message,
              },
            ],
          },
        ],
      }
    }
    if (status) {
      if (['sent', 'delivered', 'failed', 'progress', 'read'].includes(status)) {
        if (status == 'read') {
          const key: WAMessageKey = toBaileysMessageKey(payload)
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
