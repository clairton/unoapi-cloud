import { Outgoing } from './outgoing'
import { getStore } from './store'
import { Response } from './response'

export interface getClient {
  (phone: string, outgoing: Outgoing, getStore: getStore, config: ClientConfig): Promise<Client>
}

export class ConnectionInProgress extends Error {
  constructor(message: string) {
    super(message)
  }
}

export type ClientConfig = {
  ignoreGroupMessages: boolean
  ignoreBroadcastMessages: boolean
  ignoreBroadcastStatuses: boolean
  ignoreOwnMessages: boolean
  sendConnectionStatus: boolean
  ignoreCalls: string
}

export const defaultClientConfig: ClientConfig = {
  ignoreGroupMessages: true,
  ignoreBroadcastStatuses: true,
  ignoreBroadcastMessages: true,
  ignoreOwnMessages: true,
  sendConnectionStatus: true,
  ignoreCalls: '',
}

export interface Client {
  phone: string
  config: ClientConfig

  connect(): Promise<void>

  disconnect(): Promise<void>

  sendStatus(text: string, important: boolean): Promise<void>

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  send(payload: any): Promise<Response>

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  receive(messages: any[], update: boolean): Promise<void>
}
