import { Outgoing } from '../services/outgoing'
import { UNOAPI_JOB_OUTGOING } from '../defaults'
import { amqpEnqueue } from '../amqp'

export class OutgoingJob {
  private service: Outgoing
  private queueOutgoing: string

  constructor(service: Outgoing, queueOutgoing: string = UNOAPI_JOB_OUTGOING) {
    this.service = service
    this.queueOutgoing = queueOutgoing
  }

  async consume(data: object) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const a = data as any
    const phone: string = a.phone
    if (a.split) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const messages: any[] = a.payload
      await Promise.all(messages.map(async (m) => amqpEnqueue(this.queueOutgoing, phone, { phone, payload: m, split: false })))
    } else {
      await this.service.send(phone, a.payload)
    }
  }
}
