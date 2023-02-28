import { store } from './store'

export interface Client {
  phone: string

  connect(store: store): Promise<void>

  sendStatus(text: string): Promise<void>

  send(payload: any): Promise<any>

  receive(messages: object[]): Promise<object>
}
