import { store } from './store'

export interface Client {
  phone: string

  connect(store: store): Promise<void>

  disconnect(): Promise<void>

  sendStatus(text: string): Promise<void>

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  send(payload: any): Promise<any>

  receive(messages: object[]): Promise<void>
}
