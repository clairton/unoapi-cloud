import { Outgoing } from './outgoing'
import fetch, { Response, RequestInit } from 'node-fetch'
import { Webhook, getConfig } from './config'
import logger from './logger'
import { completeCloudApiWebHook, isGroupMessage, isOutgoingMessage, isNewsletterMessage, isUpdateMessage, extractDestinyPhone } from './transformer'
import { addToBlacklist, isInBlacklist } from './blacklist'
import { PublishOption } from '../amqp'

export class OutgoingCloudApi implements Outgoing {
  private getConfig: getConfig
  private isInBlacklist: isInBlacklist
  private addToBlacklist: addToBlacklist

  constructor(getConfig: getConfig, isInBlacklist: isInBlacklist, addToBlacklist: addToBlacklist) {
    this.getConfig = getConfig
    this.isInBlacklist = isInBlacklist
    this.addToBlacklist = addToBlacklist
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

  public async sendHttp(phone: string, webhook: Webhook, message: object, _options: Partial<PublishOption> = {}) {
    const destinyPhone = await this.isInBlacklist(phone, webhook.id, message)
    if (destinyPhone) {
      logger.info(`Session phone %s webhook %s and destiny phone %s are in blacklist`, phone, webhook.id, destinyPhone)
      return
    }
    if (!webhook.sendGroupMessages && isGroupMessage(message)) {
      logger.info(`Session phone %s webhook %s configured to not send group message for this webhook`, phone, webhook.id)
      return
    }
    if (!webhook.sendNewsletterMessages && isNewsletterMessage(message)) {
      logger.info(`Session phone %s webhook %s configured to not send newsletter message for this webhook`, phone, webhook.id)
      return
    }
    if (isOutgoingMessage(message)) {
      const config = await this.getConfig(phone)
      const { dataStore } = await config.getStore(phone, config)  
      await dataStore.setLastMessageDirection(destinyPhone, 'outgoing')
      if (webhook.addToBlackListOnOutgoingMessageWithTtl) {
        logger.info(`Session phone %s webhook %s configured to add to blacklist when outgoing message for this webhook`, phone, webhook.id)
        const to = extractDestinyPhone(message, false)
        await this.addToBlacklist(phone, webhook.id, to, webhook.addToBlackListOnOutgoingMessageWithTtl!)
      }
      if (!webhook.sendOutgoingMessages) {
        logger.info(`Session phone %s webhook %s configured to not send outgoing message for this webhook`, phone, webhook.id)
        return
      }
    }
    if (!webhook.sendUpdateMessages && isUpdateMessage(message)) {
      logger.info(`Session phone %s webhook %s configured to not send update message for this webhook`, phone, webhook.id)
      return
    }
    if (!webhook.sendIncomingMessages) {
      logger.info(`Session phone %s webhook %s configured to not send incoming message for this webhook`, phone, webhook.id)
      return
    }
    const body = JSON.stringify(message)
    const headers = {
      'Content-Type': 'application/json; charset=utf-8',
    }
    if (webhook.header && webhook.token) {
      headers[webhook.header] = webhook.token
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
      logger.error('Error on send to url %s with headers %s and body %s', url, JSON.stringify(headers), body)
      logger.error(error)
      throw error
    }
    logger.debug('Response: %s', response?.status)
    if (!response?.ok) {
      throw await response?.text()
    }
  }
}
