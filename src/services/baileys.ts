import { Incoming } from './incoming'
import { getClient } from './client'

export class Baileys implements Incoming {
  public async send(phone: string, payload: any) {
    const client = await getClient(phone)
    return client?.send(payload)
  }
}
