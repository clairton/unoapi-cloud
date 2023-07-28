import { Response } from './response'

export interface Incoming {
  send(phone: string, payload: object, options: object): Promise<Response>
  createClient(phone: string): Promise<boolean>
}
