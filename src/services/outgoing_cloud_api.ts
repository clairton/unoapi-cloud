import { Outgoing } from './outgoing'
import fetch, { Response, RequestInit } from 'node-fetch'
import { Webhook, getConfig } from './config'
import logger from './logger'
import { completeCloudApiWebHook } from './transformer'

export class OutgoingCloudApi implements Outgoing {
  private getConfig: getConfig

  constructor(getConfig: getConfig) {
    this.getConfig = getConfig
  }

  public async formatAndSend(phone: string, to: string, message: object) {
    const data = completeCloudApiWebHook(phone, to, message)
    return this.send(phone, data)
  }

  public async send(phone: string, message: object) {
    const config = await this.getConfig(phone)
    const promises = config.webhooks.map(async (w) => this.sendHttp(phone, w, message))
    await Promise.all(promises)
  }

  public async sendHttp(phone: string, webhook: Webhook, message: object) {
    const body = JSON.stringify(message)
    const headers = {
      'Content-Type': 'application/json; charset=utf-8',
      [webhook.header]: webhook.token,
    }
    const url = webhook.urlAbsolute || `${webhook.url}/${phone}`
    logger.trace(`Send url ${url} with headers %s and body %s`, JSON.stringify(headers), body)
    let response: Response
    try {
      const options: RequestInit = { method: 'POST', body, headers }
      if (webhook.timeoutMs) {
        options.signal = AbortSignal.timeout(webhook.timeoutMs)
      }
      response = await fetch(url, options)
    } catch (error) {
      logger.error(error, `Error on send to url ${url} with headers %s and body %s`, JSON.stringify(headers), body)
      throw error
    }
    logger.trace('Response: %s', response?.status)
    if (!response?.ok) {
      throw await response?.text()
    }
  }
}
