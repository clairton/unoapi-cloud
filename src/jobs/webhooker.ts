import { Webhook } from '../services/config'
import { Outgoing } from '../services/outgoing'
import { amqpEnqueue } from '../amqp'
import { UNOAPI_JOB_WEBHOOKER } from '../defaults'

export class WebhookerJob {
  private service: Outgoing
  constructor(service: Outgoing) {
    this.service = service
  }

  async consume(phone: string, data: object) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const a = data as any
    const payload: object = a.payload
    if (a.webhooks) {
      const webhooks: Webhook[] = a.webhooks
      Promise.all(
        webhooks.map((webhook) => {
          return amqpEnqueue(UNOAPI_JOB_WEBHOOKER, phone, { payload, webhook })
        }),
      )
    } else if (a.webhook) {
      await this.service.sendHttp(phone, a.webhook, payload, {})
    } else {
      await this.service.send(phone, payload)
    }
  }
}
