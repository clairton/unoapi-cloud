import { Outgoing } from './outgoing'
import { Response } from './response'
import { Incoming } from './incoming'
import { Info, OnNewLogin, Status } from './socket'
import { getConfig } from './config'

export interface getClient {
  ({
    phone,
    incoming,
    outgoing,
    getConfig,
    onNewLogin,
  }: {
    phone: string
    incoming: Incoming
    outgoing: Outgoing
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

  getStatus(): Status

  getInfo(): Info
}
