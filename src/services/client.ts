import { Outgoing } from './outgoing'
import { Store } from './store'

export interface getClient {
  (phone: string, store: Store, outgoing: Outgoing): Promise<Client>
}

export interface Client {
  phone: string

  connect(): Promise<void>

  disconnect(): Promise<void>

  sendStatus(text: string): Promise<void>

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  send(payload: any): Promise<any>

  receive(messages: object[]): Promise<void>
}
