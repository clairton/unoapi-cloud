import { getConfig } from './config'
import { Outgoing } from './outgoing'
import { amqpEnqueue } from '../amqp'
import { UNOAPI_JOB_OUTGOING, UNOAPI_JOB_WEBHOOKER } from '../defaults'

export class OutgoingAmqp implements Outgoing {
  private queueOutgoing: string
  private queueWebhooker: string
  private getConfig: getConfig

  constructor(getConfig: getConfig, queueOutgoing: string = UNOAPI_JOB_OUTGOING, queueWebhooker = UNOAPI_JOB_WEBHOOKER) {
    this.queueOutgoing = queueOutgoing
    this.queueWebhooker = queueWebhooker
    this.getConfig = getConfig
  }

  public async sendMany(phone: string, payload: object[]) {
    await amqpEnqueue(this.queueOutgoing, { phone, payload, split: true })
  }

  public async sendOne(phone: string, payload: object) {
    const config = await this.getConfig(phone)
    await amqpEnqueue(this.queueOutgoing, { phone, payload, webhooks: config.webhooks, split: false })
  }

  public async send(phone: string, payload: object) {
    const config = await this.getConfig(phone)
    await amqpEnqueue(this.queueWebhooker, { phone, webhooks: config.webhooks, payload, split: true })
  }

  public async sendHttp(phone: string, url: string, header: string, token: string, payload: object) {
    const webhook = { url, token, header }
    await amqpEnqueue(this.queueWebhooker, { phone, webhook, payload, split: true })
  }
}
