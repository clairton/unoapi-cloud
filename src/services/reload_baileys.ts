import { UNOAPI_SERVER_NAME } from '../defaults'
import { getClient } from '../services/client'
import { getConfig } from '../services/config'
import { Listener } from '../services/listener'
import { OnNewLogin } from '../services/socket'
import logger from './logger'
import { Reload } from './reload'

export class ReloadBaileys extends Reload {
  private getClient: getClient
  private getConfig: getConfig
  private listener: Listener
  private onNewLogin: OnNewLogin

  constructor(getClient: getClient, getConfig: getConfig, listener: Listener, onNewLogin: OnNewLogin) {
    super()
    this.getClient = getClient
    this.getConfig = getConfig
    this.listener = listener
    this.onNewLogin = onNewLogin
  }

  async run(phone: string) {
    logger.debug('Reload baileys run for phone %s', phone)
    const config = await this.getConfig(phone)
    if (config.server != UNOAPI_SERVER_NAME) {
      logger.debug('Reload broker for phone %s', phone)
      return super.run(phone)
    }
    const currentClient = await this.getClient({
      phone,
      listener: this.listener,
      getConfig: this.getConfig,
      onNewLogin: this.onNewLogin,
    })
    const store = await config.getStore(phone, config)
    const { sessionStore } = store
    if ((await sessionStore.isStatusOnline(phone)) || (await sessionStore.isStatusStandBy(phone)) || (await sessionStore.isStatusConnecting(phone))) {
      logger.warn('Reload disconnect session %s!', phone)
      await currentClient.disconnect()
    }
    await super.run(phone)
    await sessionStore.setStatus(phone, 'online') // to clear standby
    await sessionStore.setStatus(phone, 'disconnected')
    await this.getClient({
      phone,
      listener: this.listener,
      getConfig: this.getConfig,
      onNewLogin: this.onNewLogin,
    })
    logger.info('Reloaded session %s!', phone)
  }
}
