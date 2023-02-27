import { Incoming } from './incoming'
import { getClient } from './get_client'
import { getClientBaileys } from './get_client_baileys'
import { Outgoing } from './outgoing'
import { store } from './store'

export class Baileys implements Incoming {
  private store: store
  private service: Outgoing
  private getClient: getClient

  constructor(store: store, service: Outgoing, getClient: getClient = getClientBaileys) {
    this.store = store
    this.service = service
    this.getClient = getClient
  }

  public async send(phone: string, payload: object) {
    const client = await this.getClient(phone, this.store, this.service)
    return client.send(payload)
  }
}
