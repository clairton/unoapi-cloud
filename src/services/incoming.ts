import { Response } from './response'

export interface Incoming {
  send(phone: string, payload: object): Promise<Response>
}
