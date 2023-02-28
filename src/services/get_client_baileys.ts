import { Outgoing } from './outgoing'
import { Client } from './client'
import { ClientBaileys } from './client_baileys'
import { getClient } from './get_client'
import { store } from './store'

const clients: Map<string, Client> = new Map()

export const getClientBaileys: getClient = async (phone: string, store: store, outgoing: Outgoing): Promise<Client> => {
  if (!clients.has(phone)) {
    const client = new ClientBaileys(phone, outgoing)
    await client.connect(store)
    clients.set(phone, client)
  }
  return clients.get(phone) as Client
}
