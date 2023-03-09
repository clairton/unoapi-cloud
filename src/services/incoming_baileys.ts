import { Incoming } from './incoming'
import { getClient } from './client'
import { Client } from './client'
import { getClientBaileys } from './client_baileys'
import { getStore } from './store'
import { getStoreFile } from './store_file'
import { Outgoing } from './outgoing'

export class IncomingBaileys implements Incoming {
  private getStore: getStore
  private service: Outgoing
  private getClient: getClient

  constructor(service: Outgoing, getClient: getClient = getClientBaileys, getStore: getStore = getStoreFile) {
    this.service = service
    this.getClient = getClient
    this.getStore = getStore
  }

  public async send(phone: string, payload: object) {
    const client: Client = await this.getClient(phone, this.service, this.getStore)
    return client.send(payload)
  }
}
