import { Incoming } from './incoming'
import { Client, getClient } from './client'
import { getConfig } from './config'
import { Outgoing } from './outgoing'

export class IncomingBaileys implements Incoming {
  private service: Outgoing
  private getClient: getClient
  private getConfig: getConfig

  constructor(service: Outgoing, getConfig: getConfig, getClient: getClient) {
    this.service = service
    this.getConfig = getConfig
    this.getClient = getClient
  }

  public async send(phone: string, payload: object) {
    const client: Client = await this.getClient({ phone, incoming: this, outgoing: this.service, getConfig: this.getConfig })
    return client.send(payload)
  }
}
