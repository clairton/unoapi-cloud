import { Incoming } from '../services/incoming'
import { Listener } from '../services/listener'
import { getConfig } from '../services/config'
import { getClient } from '../services/client'
import { OnNewLogin } from '../services/socket'

export class DisconnectJob {
  private getClient: getClient
  private getConfig: getConfig
  private listener: Listener
  private incoming: Incoming
  private onNewLogin: OnNewLogin

  constructor(getClient: getClient, getConfig: getConfig, listener: Listener, incoming: Incoming, onNewLogin: OnNewLogin) {
    this.getClient = getClient
    this.getConfig = getConfig
    this.listener = listener
    this.incoming = incoming
    this.onNewLogin = onNewLogin
  }

  async consume(_: string, { phone }: { phone: string }) {
    const client = await this.getClient({
      phone,
      incoming: this.incoming,
      listener: this.listener,
      getConfig: this.getConfig,
      onNewLogin: this.onNewLogin,
    })
    await client.disconnect()
  }
}
