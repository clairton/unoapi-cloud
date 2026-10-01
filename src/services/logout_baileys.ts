import { Listener } from '../services/listener'
import { configs, getConfig } from '../services/config'
import { clients, getClient } from '../services/client'
import { OnNewLogin } from '../services/socket'
import { Logout, LogoutOptions } from './logout'
import logger from './logger'
import { stores } from './store'
import { dataStores } from './data_store'
import { mediaStores } from './media_store'

export class LogoutBaileys implements Logout {
  private getClient: getClient
  private getConfig: getConfig
  private listener: Listener
  private onNewLogin: OnNewLogin

  constructor(getClient: getClient, getConfig: getConfig, listener: Listener, onNewLogin: OnNewLogin) {
    this.getClient = getClient
    this.getConfig = getConfig
    this.listener = listener
    this.onNewLogin = onNewLogin
  }

  async run(phone: string, options?: LogoutOptions) {
    logger.debug('Logout baileys for phone %s', phone)
    const config = await this.getConfig(phone)
    const store = await config.getStore(phone, config)
    const { sessionStore, dataStore } = store

    const force = !!options?.force
    const shouldTrySocketLogout = force || (await sessionStore.isStatusOnline(phone))
    if (shouldTrySocketLogout) {
      try {
        const client = clients.get(phone) || (await this.getClient({
          phone,
          listener: this.listener,
          getConfig: this.getConfig,
          onNewLogin: this.onNewLogin,
        }))
        await client?.logout()
      } catch (error) {
        logger.warn(error, 'Ignore error on forced logout for %s', phone)
      }
    }
    await dataStore.cleanSession(true)
    clients.delete(phone)
    stores.delete(phone)
    dataStores.delete(phone)
    mediaStores.delete(phone)
    configs.delete(phone)
    sessionStore.setStatus(phone, 'disconnected')
  }
}
