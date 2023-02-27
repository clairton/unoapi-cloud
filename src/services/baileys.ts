import { Incoming } from './incoming'
import { getClient } from './client'
import { Outgoing } from './outgoing'

export class Baileys implements Incoming {
  private store
  private service

  constructor(store: any, service: Outgoing) {
    this.store = store
    this.service = service
  }

  public async send(phone: string, payload: any) {
    const client = await getClient(phone, this.store, this.service)
    return client?.send(payload)
  }
}
