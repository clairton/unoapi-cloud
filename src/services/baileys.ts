import { Incoming } from './incoming'
import { getClient } from './client'

export class Baileys implements Incoming {
  private store

  constructor(store: any) {
    this.store = store
  }

  public async send(phone: string, payload: any) {
    const client = await getClient(phone, this.store)
    return client?.send(payload)
  }
}
