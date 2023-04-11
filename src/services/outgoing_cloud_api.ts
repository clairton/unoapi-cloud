import { WAMessage } from '@adiwajshing/baileys'
import { Outgoing } from './outgoing'
import fetch, { Response } from 'node-fetch'
import { fromBaileysMessageContent, getMessageType, TYPE_MESSAGES_TO_PROCESS_FILE, BinTemplate } from './transformer'
import { getConfig } from './config'
import { Template } from './template'

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
    const store = await config.getStore(phone, config)
    if (messageType && !['update', 'receipt'].includes(messageType)) {
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion, @typescript-eslint/no-explicit-any
      ;(message as any).groupMetadata = await config.getGroupMetadata(i, store!)
      if (i.key && i.key.id) {
        await store?.dataStore.setKey(i.key.id, i.key)
        await store.dataStore.setMessage(i.key.remoteJid, i)
      }
    }
    if (messageType && TYPE_MESSAGES_TO_PROCESS_FILE.includes(messageType)) {
      console.debug(`Saving media...`)
      await store?.mediaStore.saveMedia(messageType, i)
    }
    let data
    try {
      data = fromBaileysMessageContent(phone, message)
    } catch (error) {
      if (error instanceof BinTemplate) {
        const template = new Template(this.getConfig)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const i: any = message
        data = await template.bind(phone, i.template.name, i.template.components)
      }
    }
    if (data) {
      return this.send(phone, data)
    } else {
      console.debug(`Not send message type ${messageType} to http phone %s message id %s`, phone, i?.key?.id)
    }
  }

  public async send(phone: string, message: object) {
    const config = await this.getConfig(phone)
    const promises = config.webhooks.map(async (w) => this.sendHttp(phone, w.url, w.header, w.token, message))
    await Promise.all(promises)
  }

  public async sendHttp(phone: string, url: string, header: string, token: string, message: object) {
    const body = JSON.stringify(message)
    const headers = {
      'Content-Type': 'application/json; charset=utf-8',
      [header]: token,
    }
    const uri = this.uri(url, phone)
    console.debug(`Send url ${uri} with headers %s and body %s`, headers, body)
    const response: Response = await fetch(uri, { method: 'POST', body, headers })
    console.debug('Response: ', response.status)
    if (!response.ok) {
      throw await response.text()
    }
  }

  private uri(url: string, phone: string) {
    return `${url}/${phone}`
  }
}
