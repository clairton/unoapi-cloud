import { getClient } from '../services/client'
import { getConfig } from '../services/config'
import { Listener } from '../services/listener'
import { OnNewLogin } from '../services/socket'
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
    await super.run(phone)
    const newClient = await this.getClient({
      phone,
      listener: this.listener,
      getConfig: this.getConfig,
      onNewLogin: this.onNewLogin,
    })
    await newClient.connect(1)
  }
}
