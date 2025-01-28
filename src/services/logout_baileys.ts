import { Listener } from '../services/listener'
import { getConfig } from '../services/config'
import { getClient } from '../services/client'
import { OnNewLogin } from '../services/socket'
import { Logout } from './logout'

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

  async run(phone: string) {
    const client = await this.getClient({
      phone,
      listener: this.listener,
      getConfig: this.getConfig,
      onNewLogin: this.onNewLogin,
    })
    await client.logout()
  }
}
