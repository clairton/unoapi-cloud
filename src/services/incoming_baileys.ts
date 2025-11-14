import { Incoming } from './incoming'
import { Client, getClient } from './client'
import { getConfig } from './config'
import { OnNewLogin } from './socket'
import logger from './logger'
import { Listener } from './listener'

export class IncomingBaileys implements Incoming {
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

  public async send(phone: string, payload: object, options: object) {
    const client: Client = await this.getClient({
      phone,
      listener: this.service,
      getConfig: this.getConfig,
      onNewLogin: this.onNewLogin,
    })
    if (!client) {
      throw 'Disconnected Client ' + phone
    }
    logger.debug('Retrieved client for %s', phone)
    return client.send(payload, options)
  }
}
