import { Outgoing } from './outgoing'
import fetch, { Response } from 'node-fetch'
import { fromBaileysMessageContent, getMessageType } from './transformer'
import { MessageFilter } from './message_filter'

export class OutgoingCloudApi implements Outgoing {
  private url: string
  private token: string
  private header: string
  private filter: MessageFilter

  constructor(filter: MessageFilter, url: string, token: string, header = 'Authorization') {
    this.filter = filter
    this.url = url
    this.token = token
    this.header = header
  }

  public async sendMany(phone: string, messages: object[]) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const filteredMessages = messages.filter((m: any) => {
      const messageType = getMessageType(m)
      return m.key && !this.filter.isIgnore({ key: m.key, messageType })
    })
    console.debug('%s filtereds messages/updates of %s', messages.length - filteredMessages.length, messages.length)
    await Promise.all(filteredMessages.map((m: object) => this.sendOne(phone, m)))
  }

  public async sendOne(phone: string, message: object) {
    console.debug(`Receive message %s`, message)
    const data = fromBaileysMessageContent(phone, message)
    return this.send(phone, data)
  }

  public async send(phone: string, message: object) {
    const body = JSON.stringify(message)
    const headers = {
      'Content-Type': 'application/json; charset=utf-8',
      [this.header]: this.token,
    }
    const url = `${this.url}/${phone}`
    console.debug(`Send url ${url} with headers %s and body %s`, headers, body)
    const response: Response = await fetch(url, { method: 'POST', body, headers })
    if (!response.ok) {
      throw await response.text()
    }
  }
}
