import { Outgoing } from './outgoing'
import fetch, { Response, RequestInit } from 'node-fetch'
import { Webhook, getConfig } from './config'
import logger from './logger'
import { completeCloudApiWebHook, isGroupMessage, isOutgoingMessage, isNewsletterMessage, isUpdateMessage, extractDestinyPhone, extractFromPhone } from './transformer'
import { addToBlacklist, isInBlacklist } from './blacklist'
import { PublishOption } from '../amqp'
import { WEBHOOK_CB_ENABLED, WEBHOOK_CB_FAILURE_THRESHOLD, WEBHOOK_CB_OPEN_MS, WEBHOOK_CB_FAILURE_TTL_MS } from '../defaults'
import { isWebhookCircuitOpen, openWebhookCircuit, closeWebhookCircuit, bumpWebhookCircuitFailure } from './redis'

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
    const cbEnabled = !!WEBHOOK_CB_ENABLED && WEBHOOK_CB_FAILURE_THRESHOLD > 0 && WEBHOOK_CB_OPEN_MS > 0
    const cbId = (webhook && (webhook.id || webhook.url || webhook.urlAbsolute)) ? `${webhook.id || webhook.url || webhook.urlAbsolute}` : 'default'
    const cbKey = `${phone}:${cbId}`
    const now = Date.now()
    if (cbEnabled) {
      try {
        const open = await isWebhookCircuitOpen(phone, cbId)
        if (open) {
          logger.warn('WEBHOOK_CB open: skipping send (phone=%s webhook=%s)', phone, cbId)
          return
        }
      } catch {}
      if (isCircuitOpenLocal(cbKey, now)) {
        logger.warn('WEBHOOK_CB open (local): skipping send (phone=%s webhook=%s)', phone, cbId)
        return
      }
    }
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
    const fromPhone = extractFromPhone(message, false)
    if (fromPhone && fromPhone != phone) {
      const config = await this.getConfig(phone)
      const { dataStore } = await config.getStore(phone, config)
      await dataStore.setLastMessageDirection(fromPhone, 'outgoing')
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
      if (cbEnabled) {
        await this.handleCircuitFailure(phone, cbId, cbKey, error as any)
        return
      }
      throw error
    }
    logger.debug('Response: %s', response?.status)
    if (!response?.ok) {
      const errText = await response?.text()
      if (cbEnabled) {
        await this.handleCircuitFailure(phone, cbId, cbKey, errText)
        return
      }
      throw errText
    }
    if (cbEnabled) {
      try {
        await closeWebhookCircuit(phone, cbId)
      } catch {}
      resetCircuitLocal(cbKey)
    }
  }

  private async handleCircuitFailure(phone: string, cbId: string, cbKey: string, error: any) {
    try {
      const threshold = WEBHOOK_CB_FAILURE_THRESHOLD || 1
      const openMs = WEBHOOK_CB_OPEN_MS || 120000
      const ttlMs = WEBHOOK_CB_FAILURE_TTL_MS || openMs
      const count = await bumpWebhookCircuitFailure(phone, cbId, ttlMs)
      const localCount = bumpCircuitFailureLocal(cbKey, ttlMs)
      const finalCount = Math.max(count || 0, localCount || 0)
      if (finalCount >= threshold) {
        await openWebhookCircuit(phone, cbId, openMs)
        openCircuitLocal(cbKey, openMs)
        logger.warn('WEBHOOK_CB opened (phone=%s webhook=%s count=%s openMs=%s)', phone, cbId, finalCount, openMs)
      } else {
        logger.warn('WEBHOOK_CB failure (phone=%s webhook=%s count=%s/%s)', phone, cbId, finalCount, threshold)
      }
    } catch (e) {
      logger.warn(e as any, 'WEBHOOK_CB failure handler error')
    }
    try { logger.warn(error as any, 'WEBHOOK_CB send failed (phone=%s webhook=%s)', phone, cbId) } catch {}
  }
}

const cbOpenUntil: Map<string, number> = new Map()
const cbFailState: Map<string, { count: number; exp: number }> = new Map()

const isCircuitOpenLocal = (key: string, now: number) => {
  const until = cbOpenUntil.get(key)
  if (!until) return false
  if (now >= until) {
    cbOpenUntil.delete(key)
    return false
  }
  return true
}

const openCircuitLocal = (key: string, openMs: number) => {
  cbOpenUntil.set(key, Date.now() + Math.max(1, openMs || 0))
}

const resetCircuitLocal = (key: string) => {
  cbOpenUntil.delete(key)
  cbFailState.delete(key)
}

const bumpCircuitFailureLocal = (key: string, ttlMs: number): number => {
  const now = Date.now()
  const ttl = Math.max(1, ttlMs || 0)
  const current = cbFailState.get(key)
  if (!current || now >= current.exp) {
    cbFailState.set(key, { count: 1, exp: now + ttl })
    return 1
  }
  current.count += 1
  return current.count
}
