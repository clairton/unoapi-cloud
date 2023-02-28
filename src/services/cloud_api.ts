import { Outgoing } from './outgoing'
import fetch, { Response } from 'node-fetch'
import { fromBaileysMessageContent } from './transformer'

export class CloudApi implements Outgoing {
  private url: string
  private token: string
  private header: string

  constructor(url: string, token: string, header = 'Authorization') {
    this.url = url
    this.token = token
    this.header = header
  }

  public async sendMany(phone: string, messages: any[]) {
    return Promise.all(messages.map((m: any) => this.sendOne(phone, m)))
  }

  public async sendOne(phone: string, message: any) {
    const data = fromBaileysMessageContent(phone, message)
    const body = JSON.stringify(data)
    const headers = {
      'Content-Type': 'application/json; charset=utf-8',
      [this.header]: this.token,
    }
    const url = `${this.url}/${phone}`
    console.debug(`Send url ${url} with headers %s and body %s`, headers, body)
    const response: Response = await fetch(url, { method: 'POST', body, headers })
    if (response.ok) {
      return response.json()
    }
  }
}
