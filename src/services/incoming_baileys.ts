import { Incoming } from './incoming'
import { getClient } from './get_client'
import { Client } from './client'
import { getClientBaileys } from './get_client_baileys'
import { getStore } from './get_store'
import { Outgoing } from './outgoing'
import { Store } from './store'

export class IncomingBaileys implements Incoming {
  private getStore: getStore
  private service: Outgoing
  private getClient: getClient

  constructor(getStore: getStore, service: Outgoing, getClient: getClient = getClientBaileys) {
    this.getStore = getStore
    this.service = service
    this.getClient = getClient
  }

  public async send(phone: string, payload: object) {
    const store: Store = await this.getStore(phone)
    const client: Client = await this.getClient(phone, store, this.service)
    return client.send(payload)
  }
}
