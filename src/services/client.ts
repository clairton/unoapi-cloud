import { Outgoing } from './outgoing'
import { getStore } from './store'

export interface getClient {
  (phone: string, outgoing: Outgoing, getStore: getStore): Promise<Client>
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
