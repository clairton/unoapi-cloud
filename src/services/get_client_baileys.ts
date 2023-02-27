import { Outgoing } from './outgoing'
import { Client } from './client'
import { getClient } from './get_client'
import { store } from './store'

const clients: Map<string, Client> = new Map()

export const getClientBaileys: getClient = async (phone: string, store: store, outgoing: Outgoing): Promise<Client> => {
  if (!clients.has(phone)) {
    const client = new Client(phone, store, outgoing)
    await client.connect()
    clients.set(phone, client)
  }
  return clients.get(phone) as Client
}
