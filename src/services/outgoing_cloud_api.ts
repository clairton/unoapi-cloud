import { WAMessage } from '@whiskeysockets/baileys'
import { Outgoing } from './outgoing'
import fetch, { Response } from 'node-fetch'
import { fromBaileysMessageContent, getMessageType, BindTemplateError, isSaveMedia } from './transformer'
import { getConfig } from './config'
import { Template } from './template'
import logger from './logger'

export class FailedSend extends Error {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private errors: any[]

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  constructor(errors: any[]) {
    super('')
    this.errors = errors
  }

  getErrors() {
    return this.errors
  }
}

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
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const errors: any[] = []
    await Promise.all(
      filteredMessages.map(async (m: object) => {
        try {
          return this.sendOne(phone, m)
        } catch (error) {
          errors.push({ error, message: m })
        }
      }),
    )
    if (errors.length) {
      throw new FailedSend(errors)
    }
  }

  public async sendOne(phone: string, message: object) {
    logger.debug(`Receive message %s`, JSON.stringify(message))
    let i: WAMessage = message as WAMessage
    const messageType = getMessageType(message)
    logger.debug(`messageType %s...`, messageType)
    const config = await this.getConfig(phone)
    const store = await config.getStore(phone, config)
    if (messageType && !['update', 'receipt'].includes(messageType)) {
      message = await config.getMessageMetadata(i)
      if (i.key && i.key.id) {
        await store?.dataStore.setKey(i.key.id, i.key)
        i.key.remoteJid && (await store.dataStore.setMessage(i.key.remoteJid, i))
      }
    }
    if (isSaveMedia(i)) {
      logger.debug(`Saving media...`)
      i = await store?.mediaStore.saveMedia(i)
    }
    let data
    try {
      data = fromBaileysMessageContent(phone, message)
    } catch (error) {
      if (error instanceof BindTemplateError) {
        const template = new Template(this.getConfig)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const i: any = message
        data = await template.bind(phone, i.template.name, i.template.components)
      }
      throw error
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
      logger.error(error, `Error on send to url ${uri} with headers %s and body %s`, JSON.stringify(headers), body)
      throw error
    }
    logger.debug('Response: %s', response?.status)
    if (!response?.ok) {
      throw await response?.text()
    }
  }

  private uri(url: string, phone: string) {
    return `${url}/${phone}`
  }
}
