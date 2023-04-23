import { Incoming } from './incoming'
import { Client, getClient } from './client'
import { getConfig } from './config'
import { Outgoing } from './outgoing'

export class IncomingBaileys implements Incoming {
  private service: Outgoing
  private getClient: getClient
  private getConfig: getConfig
  private onNewLogin: (_phone: string) => void
  private onDisconnected: (_phone: string, _payload: object) => void

  constructor(
    service: Outgoing,
    getConfig: getConfig,
    getClient: getClient,
    onNewLogin: (_phone: string) => void,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars, @typescript-eslint/no-empty-function
    onDisconnected: (_phone: string, _payload: object) => void = (_phone: string, _payload: object) => {},
  ) {
    this.service = service
    this.getConfig = getConfig
    this.getClient = getClient
    this.onNewLogin = onNewLogin
    this.onDisconnected = onDisconnected
  }

  public async send(phone: string, payload: object, options: object) {
    const client: Client = await this.getClient({
      phone,
      incoming: this,
      outgoing: this.service,
      getConfig: this.getConfig,
      onNewLogin: this.onNewLogin,
      onDisconnected: this.onDisconnected,
    })
    console.debug('Retrieved client baileys %s', phone)
    return client.send(payload, options)
  }
}
