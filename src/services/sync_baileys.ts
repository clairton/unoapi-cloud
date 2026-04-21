import logger from './logger'
import { Client, getClient } from './client'
import { getConfig } from './config'
import { OnNewLogin } from './socket'
import { Listener } from './listener'
import { Sync } from './sync'

export class SyncBaileys implements Sync {
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

  async process(phone, jids: string[], force: boolean) {
    const client: Client = await this.getClient({
      phone,
      listener: this.service,
      getConfig: this.getConfig,
      onNewLogin: this.onNewLogin,
    })
    if (!client) {
      throw 'Disconnected Client ' + phone
    }
    const resp = await client.assertSessions(jids, force)
    logger.debug('Assert sessions from: ', jids)
    if (resp) {
      logger.debug('Assert sessions with success')
    } else {
      logger.debug('Assert sessions not ocurred')
    }
    return resp
  }
}
