import { Outgoing } from './outgoing'
import fetch, { Response } from 'node-fetch'
import { getConfig } from './config'
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
    const promises = config.webhooks.map(async (w) => this.sendHttp(phone, w.urlAbsolute || `${w.url}/${phone}`, w.header, w.token, message))
    await Promise.all(promises)
  }

  public async sendHttp(_phone: string, url: string, header: string, token: string, message: object) {
    const body = JSON.stringify(message)
    const headers = {
      'Content-Type': 'application/json; charset=utf-8',
      [header]: token,
    }
    logger.debug(`Send url ${url} with headers %s and body %s`, JSON.stringify(headers), body)
    let response: Response
    try {
      response = await fetch(url, { method: 'POST', body, headers })
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
