import { Outgoing } from './outgoing'
import fetch, { Response, RequestInit } from 'node-fetch'
import { Webhook, getConfig } from './config'
import logger from './logger'
import { completeCloudApiWebHook } from './transformer'
import { isInBlacklist } from './blacklist'

export class OutgoingCloudApi implements Outgoing {
  private getConfig: getConfig
  private isInBlacklist: isInBlacklist

  constructor(getConfig: getConfig, isInBlacklist: isInBlacklist) {
    this.getConfig = getConfig
    this.isInBlacklist = isInBlacklist
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
    const destinyPhone = await this.isInBlacklist(phone, webhook.id, message)
    if (destinyPhone) {
      logger.info(`Session Phone %s webhook %s and destiny phone %s is in blacklist, ignore send`, phone, webhook.id, destinyPhone)
      return
    }
    const body = JSON.stringify(message)
    const headers = {
      'Content-Type': 'application/json; charset=utf-8',
      [webhook.header]: webhook.token,
    }
    const url = webhook.urlAbsolute || `${webhook.url}/${phone}`
    logger.debug(`Send url ${url} with headers %s and body %s`, JSON.stringify(headers), body)
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
    logger.debug('Response: %s', response?.status)
    if (!response?.ok) {
      throw await response?.text()
    }
  }
}
