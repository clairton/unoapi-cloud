import { Response } from './response'
import { Incoming } from './incoming'
import { OnNewLogin } from './socket'
import { getConfig } from './config'
import { Listener } from './listener'

export const clients: Map<string, Client> = new Map()

export interface getClient {
  ({
    phone,
    incoming,
    listener,
    getConfig,
    onNewLogin,
  }: {
    phone: string
    incoming: Incoming
    listener: Listener
    getConfig: getConfig
    onNewLogin: OnNewLogin
  }): Promise<Client>
}

export class ConnectionInProgress extends Error {
  constructor(message: string) {
    super(message)
  }
}

export interface Client {
  connect(): Promise<void>

  disconnect(): Promise<void>

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  send(payload: any, options: any): Promise<Response>

  getMessageMetadata<T>(message: T): Promise<T>
}
