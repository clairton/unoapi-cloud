import { AnyMessageContent, WASocket } from '@adiwajshing/baileys'
import { Outgoing } from './outgoing'
import { store } from './store'
import { DataStore } from './data_store'
import { connect } from './socket'
import { Client } from './client'
import { toBaileysMessageContent, phoneNumberToJid, isIndividualJid } from './transformer'
import { v1 as uuid } from 'uuid'

export class ClientBaileys implements Client {
  public phone: string
  private sock: WASocket | undefined
  private outgoing: Outgoing
  private dataStore: DataStore | undefined

  constructor(phone: string, outgoing: Outgoing) {
    this.phone = phone
    this.outgoing = outgoing
  }

  async connect(store: store) {
    const { sock, dataStore } = await connect({ store, client: this })
    this.sock = sock
    this.dataStore = dataStore
  }

  async sendStatus(text: string) {
    const payload = {
      key: {
        remoteJid: phoneNumberToJid(this.phone),
        id: uuid(),
      },
      message: {
        conversation: text,
      },
      messageTimestamp: new Date().getTime(),
    }
    return this.outgoing.sendOne(this.phone, payload)
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
                code: 3,
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
          const key = this.dataStore?.loadKey(payload?.key?.id)
          if (key) {
            await this.sock?.readMessages([key])
          }
        }
        return { success: true }
      } else {
        throw new Error(`Unknow message status ${status}`)
      }
    } else if (type) {
      if (['text', 'image', 'audio', 'document', 'video', 'template'].includes(type)) {
        const jid: string = await this.toJid(to)
        if (!jid) {
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
                    code: 2,
                    title: `The number ${to} does not have Whatsapp Account`,
                  },
                ],
              },
            ],
          }
        }
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

  private async toJid(phoneNumber: string) {
    const bindJid: string = phoneNumberToJid(phoneNumber)
    if (isIndividualJid(bindJid)) {
      const results = await this.sock?.onWhatsApp(bindJid)
      const result = results && results[0]
      if (result && result.exists) {
        console.debug(`${bindJid} exists on WhatsApp, as jid: ${result.jid}`)
        return result.jid
      } else {
        console.warn(`${bindJid} not exists on WhatsApp`)
        return ''
      }
    }
    return bindJid
  }
}
