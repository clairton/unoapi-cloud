import { Response } from './response'
import { OnNewLogin } from './socket'
import { getConfig } from './config'
import { Listener } from './listener'

export const clients: Map<string, Client> = new Map()

export type ContactStatus = 'valid' | 'processing' | 'invalid' | 'failed'

export interface Contact {
  wa_id: String | undefined
  input: String
  status: ContactStatus
}

export interface getClient {
  ({ phone, listener, getConfig, onNewLogin }: { phone: string; listener: Listener; getConfig: getConfig; onNewLogin: OnNewLogin }): Promise<Client>
}

export class ConnectionInProgress extends Error {
  constructor(message: string) {
    super(message)
  }
}

export interface Client {
  connect(time: number): Promise<void | boolean>

  disconnect(): Promise<void>

  logout(): Promise<void>

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  send(payload: any, options: any): Promise<Response>

  getMessageMetadata<T>(message: T): Promise<T>

  contacts(numbers: string[]): Promise<Contact[]>
}
