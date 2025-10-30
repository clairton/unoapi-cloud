import { Contact } from './contact'
import { Client, getClient } from './client'
import { getConfig } from './config'
import { OnNewLogin } from './socket'
import { Listener } from './listener'
import logger from './logger'

export default class ContactBaileys implements Contact {
  private service: Listener
  private getClient: getClient
  private getConfig: getConfig
  private onNewLogin: OnNewLogin

  constructor(service: Listener, getConfig: getConfig, getClient: getClient, onNewLogin: OnNewLogin) {
    this.service = service
    this.getConfig = getConfig
    this.getClient = getClient
    this.onNewLogin = onNewLogin
  }

  public async verify(phone: string, numbers: string[], webhook: string | undefined) {
    const client: Client = await this.getClient({
      phone,
      listener: this.service,
      getConfig: this.getConfig,
      onNewLogin: this.onNewLogin,
    })
    if (!client) {
      throw 'Disconnected Client ' + phone
    }
    const contacts = await client.contacts(numbers)
    if (webhook) {
      const body = JSON.stringify({ contacts })
      const headers = {
        'Content-Type': 'application/json; charset=utf-8',
      }
      let response: Response
      try {
        const options: RequestInit = { method: 'POST', body, headers }
        response = await fetch(webhook, options)
      } catch (error) {
        logger.error('Error on send to url %s with body %s', webhook, body)
        logger.error(error)
        throw error
      }
      logger.debug('Response: %s', response?.status)
      if (!response?.ok) {
        throw await response?.text()
      }
    }
    return { contacts }
  }
}
