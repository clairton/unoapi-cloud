import { Incoming } from '../services/incoming'

export class NotificationJob {
  private incoming: Incoming

  constructor(incoming: Incoming) {
    this.incoming = incoming
  }

  async consume(data: object) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const a = data as any
    const phone: string = a.phone
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const payload: any = a.payload
    const options: object = a.options
    this.incoming.send(phone, payload, options)
  }
}
