import { Webhook, getConfig } from './config'
import { Outgoing } from './outgoing'
import { PublishOption, amqpPublish } from '../amqp'
import { UNOAPI_EXCHANGE_BROKER_NAME, UNOAPI_QUEUE_OUTGOING } from '../defaults'
import { completeCloudApiWebHook } from './transformer'

export class OutgoingAmqp implements Outgoing {
  private getConfig: getConfig

  constructor(getConfig: getConfig) {
    this.getConfig = getConfig
  }

  public async formatAndSend(phone: string, to: string, message: object) {
    const data = completeCloudApiWebHook(phone, to, message)
    return this.send(phone, data)
  }

  public async send(phone: string, payload: object) {
    const config = await this.getConfig(phone)
    await amqpPublish(
      UNOAPI_EXCHANGE_BROKER_NAME,
      UNOAPI_QUEUE_OUTGOING,
      phone,
      { webhooks: config.webhooks, payload, split: true },
      { type: 'topic' },
    )
  }

  public async sendHttp(phone: string, webhook: Webhook, payload: object, options: Partial<PublishOption> = {}) {
    options.type = 'topic'
    await amqpPublish(UNOAPI_EXCHANGE_BROKER_NAME, UNOAPI_QUEUE_OUTGOING, phone, { webhooks: [webhook], payload, split: false }, options)
  }
}
