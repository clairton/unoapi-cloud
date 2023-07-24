import { Incoming } from './incoming'
import { Client, getClient } from './client'
import { getConfig } from './config'
import { Outgoing } from './outgoing'
import { OnNewLogin } from './socket'
import logger from './logger'

export class IncomingBaileys implements Incoming {
  private service: Outgoing
  private getClient: getClient
  private getConfig: getConfig
  private onNewLogin: OnNewLogin

  constructor(service: Outgoing, getConfig: getConfig, getClient: getClient, onNewLogin: OnNewLogin) {
    this.service = service
    this.getConfig = getConfig
    this.getClient = getClient
    this.onNewLogin = onNewLogin
  }

  public async send(phone: string, payload: object, options: object) {
    const client: Client = await this.getClient({
      phone,
      incoming: this,
      outgoing: this.service,
      getConfig: this.getConfig,
      onNewLogin: this.onNewLogin,
    })
    logger.debug('Retrieved client baileys %s', phone)
    return client.send(payload, options)
  }
}
