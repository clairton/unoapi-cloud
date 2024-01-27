import { getClient } from '../services/client'
import { getConfig } from '../services/config'
import { Incoming } from '../services/incoming'
import { Outgoing } from '../services/outgoing'
import { OnNewLogin } from '../services/socket'

export class ReloadJob {
  private getClient: getClient
  private getConfig: getConfig
  private outgoing: Outgoing
  private incoming: Incoming
  private onNewLogin: OnNewLogin

  constructor(getClient: getClient, getConfig: getConfig, outgoing: Outgoing, incoming: Incoming, onNewLogin: OnNewLogin) {
    this.getClient = getClient
    this.getConfig = getConfig
    this.outgoing = outgoing
    this.incoming = incoming
    this.onNewLogin = onNewLogin
  }

  async consume(data: object) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const a = data as any
    const phone: string = a.phone
    const currentClient = await this.getClient({
      phone,
      incoming: this.incoming,
      outgoing: this.outgoing,
      getConfig: this.getConfig,
      onNewLogin: this.onNewLogin,
    })
    if (currentClient.getStatus().connected) {
      await currentClient.disconnect()
    }
    const newClient = await this.getClient({
      phone,
      incoming: this.incoming,
      outgoing: this.outgoing,
      getConfig: this.getConfig,
      onNewLogin: this.onNewLogin,
    })
    await newClient.connect()
  }
}
