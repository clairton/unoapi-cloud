import { Outgoing } from '../services/outgoing'
import { UNOAPI_EXCHANGE_BROKER_NAME, UNOAPI_JOB_OUTGOING } from '../defaults'
import { amqpPublish } from '../amqp'

export class OutgoingJob {
  private service: Outgoing
  constructor(service: Outgoing) {
    this.service = service
  }

  async consume(phone: string, data: object) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const a = data as any
    if (a.split) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const messages: any[] = a.payload
      await Promise.all(
        messages.map(async (m) => {
          return amqpPublish(UNOAPI_EXCHANGE_BROKER_NAME, UNOAPI_JOB_OUTGOING, phone, { payload: m, split: false })
        })
      )
    } else {
      await this.service.send(phone, a.payload)
    }
  }
}
