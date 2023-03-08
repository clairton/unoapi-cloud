import { Outgoing } from './outgoing'
import { Client } from './client'
import { ClientBaileys } from './client_baileys'
import { getClient } from './get_client'
import { Store } from './store'

const clients: Map<string, Client> = new Map()

export const getClientBaileys: getClient = async (phone: string, store: Store, outgoing: Outgoing): Promise<Client> => {
  if (!clients.has(phone)) {
    console.debug('Creating client baileys %s', phone)
    const client = new ClientBaileys(phone, store, outgoing)
    await client.connect()
    clients.set(phone, client)
  } else {
    console.debug('Retrieving client baileys %s', phone)
  }
  return clients.get(phone) as Client
}
