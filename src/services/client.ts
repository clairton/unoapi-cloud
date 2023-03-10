import { DataStore } from './data_store'
import { Outgoing } from './outgoing'
import { getStore } from './store'

export interface getClient {
  (phone: string, outgoing: Outgoing, getStore: getStore): Promise<Client>
}

export class ConnectionInProgress extends Error {
  constructor(message: string) {
    super(message)
  }
}

export interface Client {
  phone: string

  connect(): Promise<void>

  disconnect(): Promise<void>

  getDataStore(): DataStore

  sendStatus(text: string): Promise<void>

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  send(payload: any): Promise<any>

  receive(messages: object[], update: boolean): Promise<void>
}
