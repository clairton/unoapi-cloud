import { Outgoing } from './outgoing'
import { Client } from './client'
import { store } from './store'

export interface getClient {
  (phone: string, store: store, outgoing: Outgoing): Promise<Client>
}
