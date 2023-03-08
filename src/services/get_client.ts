import { Outgoing } from './outgoing'
import { Client } from './client'
import { Store } from './store'

export interface getClient {
  (phone: string, store: Store, outgoing: Outgoing): Promise<Client>
}
