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

  async run(phone: string, params = { force: false }) {
    logger.info('Reloading session %s...', phone)
    const currentClient = await this.getClient({
      phone,
      listener: this.listener,
      getConfig: this.getConfig,
      onNewLogin: this.onNewLogin,
    })
    const config = await this.getConfig(phone)
    const store = await config.getStore(phone, config)
    const { sessionStore }  = store
    if (await sessionStore.isStatusOnline(phone)) {
      await currentClient.disconnect()
    }
    if (params.force) {
      if (await sessionStore.isStatusStandBy(phone) || await sessionStore.isStatusConnecting(phone)) {
        logger.warn('Force restart session %s!', phone)
        await currentClient.disconnect()
        await sessionStore.setStatus(phone, 'online') // to clear standby
        await sessionStore.setStatus(phone, 'disconnected')
      }
    }
    await super.run(phone)
    const newClient = await this.getClient({
      phone,
      listener: this.listener,
      getConfig: this.getConfig,
      onNewLogin: this.onNewLogin,
    })
    await newClient.send({
      to: phone,
      type: 'text',
      text: {
        body: 'hello'
      } 
    }, {})
    logger.info('Reloaded session %s!', phone)
  }
}
