import { PublishOption } from '../amqp'
import { Webhook } from './config'

export class FailedSend extends Error {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private errors: any[]

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  constructor(errors: any[]) {
    super('')
    this.errors = errors
  }

  getErrors() {
    return this.errors
  }
}

export interface Outgoing {
  formatAndSend(phone: string, to: string, message: object): Promise<void>
  send(phone: string, message: object): Promise<void>
  sendHttp(phone: string, webhook: Webhook, message: object, options: Partial<PublishOption>): Promise<void>
}
