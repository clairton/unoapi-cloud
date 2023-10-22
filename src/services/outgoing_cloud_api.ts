import { WAMessage } from '@whiskeysockets/baileys'
import { Outgoing } from './outgoing'
import fetch, { Response } from 'node-fetch'
import { fromBaileysMessageContent, getMessageType, TYPE_MESSAGES_TO_PROCESS_FILE, BinTemplate } from './transformer'
import { getConfig } from './config'
import { Template } from './template'
import logger from './logger'

export class OutgoingCloudApi implements Outgoing {
  private getConfig: getConfig

  constructor(getConfig: getConfig) {
    this.getConfig = getConfig
  }

  public async sendMany(phone: string, messages: object[]) {
    const config = await this.getConfig(phone)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const filteredMessages = messages.filter((m: any) => {
      return !m.key || !config.shouldIgnoreKey(m.key, getMessageType(m))
    })
    logger.debug('%s filtereds messages/updates of %s', messages.length - filteredMessages.length, messages.length)
    await Promise.all(filteredMessages.map(async (m: object) => this.sendOne(phone, m)))
  }

  public async sendOne(phone: string, message: object) {
    logger.debug(`Receive message %s`, JSON.stringify(message))
    const i: WAMessage = message as WAMessage
    const messageType = getMessageType(message)
    logger.debug(`messageType %s...`, messageType)
    const config = await this.getConfig(phone)
    const store = await config.getStore(phone, config)
    if (messageType && !['update', 'receipt'].includes(messageType)) {
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion, @typescript-eslint/no-explicit-any
      ;(message as any).groupMetadata = await config.getGroupMetadata(i, store!)
      if (i.key && i.key.id) {
        await store?.dataStore.setKey(i.key.id, i.key)
        i.key.remoteJid && (await store.dataStore.setMessage(i.key.remoteJid, i))
      }
    }
    if (messageType && TYPE_MESSAGES_TO_PROCESS_FILE.includes(messageType)) {
      logger.debug(`Saving media...`)
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
    } finally {
      const state = data?.entry[0]?.changes[0]?.value?.statuses[0] || {}
      if (state) {
        const status = state.status || 'error'
        const id = state.id
        await store?.dataStore?.setStatus(id, status)
      }
    }
    if (data) {
      return this.send(phone, data)
    } else {
      logger.debug(`Not send message type ${messageType} to http phone %s message id %s`, phone, i?.key?.id)
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
    logger.debug(`Send url ${uri} with headers %s and body %s`, JSON.stringify(headers), body)
    let response: Response
    try {
      response = await fetch(uri, { method: 'POST', body, headers })
    } catch (error) {
      logger.error(`Error on send to url ${uri} with headers %s and body %s`, JSON.stringify(headers), body)
      throw error
    }
    logger.debug('Response: %s', response.status)
    if (!response.ok) {
      throw await response.text()
    }
  }

  private uri(url: string, phone: string) {
    return `${url}/${phone}`
  }
}
