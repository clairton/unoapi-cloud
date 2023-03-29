import { WAMessage } from '@adiwajshing/baileys'
import { Outgoing } from './outgoing'
import fetch, { Response } from 'node-fetch'
import { fromBaileysMessageContent, getMessageType, TYPE_MESSAGES_TO_PROCESS_FILE } from './transformer'
import { getConfig } from './config'

export class OutgoingCloudApi implements Outgoing {
  private getConfig: getConfig

  constructor(getConfig: getConfig) {
    this.getConfig = getConfig
  }

  public async sendMany(phone: string, messages: object[]) {
    const config = await this.getConfig(phone)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const filteredMessages = messages.filter((m: any) => {
      const messageType = getMessageType(m)
      return m.key && !config.shouldIgnoreKey(m.key, messageType)
    })
    console.debug('%s filtereds messages/updates of %s', messages.length - filteredMessages.length, messages.length)
    await Promise.all(filteredMessages.map(async (m: object) => this.sendOne(phone, m)))
  }

  public async sendOne(phone: string, message: object) {
    console.debug(`Receive message %s`, message)
    const i: WAMessage = message as WAMessage
    const messageType = getMessageType(message)
    console.debug(`messageType %s...`, messageType)
    const config = await this.getConfig(phone)
    const store = await config.getStore(phone)
    if (messageType && !['update', 'receipt'].includes(messageType)) {
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      Reflect.set(message, 'groupMetadata', await config.getGroupMetadata(i, store!))
    }
    if (messageType && TYPE_MESSAGES_TO_PROCESS_FILE.includes(messageType)) {
      console.debug(`Saving media...`)
      await store?.mediaStore.saveMedia(messageType, i)
    }
    if (i.key && i.key.id) {
      await store?.dataStore.setKey(i.key.id, i.key)
      await store.dataStore.setMessage(i.key.remoteJid, i)
    }
    const data = fromBaileysMessageContent(phone, message)
    return this.send(phone, data)
  }

  public async send(phone: string, message: object) {
    const config = await this.getConfig(phone)
    config.webhooks.map(async (w) => {
      this.sendHttp(phone, w.url, w.header, w.token, message)
    })
  }

  public async sendHttp(phone: string, url: string, header: string, token: string, message: object) {
    const body = JSON.stringify(message)
    const headers = {
      'Content-Type': 'application/json; charset=utf-8',
      [header]: token,
    }
    const uri = `${url}/${phone}`
    console.debug(`Send url ${url} with headers %s and body %s`, headers, body)
    const response: Response = await fetch(uri, { method: 'POST', body, headers })
    console.debug('Response: ', response.status)
    if (!response.ok) {
      throw await response.text()
    }
  }
}
