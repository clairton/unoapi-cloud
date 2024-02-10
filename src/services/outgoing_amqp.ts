import { getConfig } from './config'
import { Outgoing } from './outgoing'
import { amqpEnqueue } from '../amqp'
import { UNOAPI_JOB_WEBHOOKER } from '../defaults'
import { completeCloudApiWebHook } from './transformer'

export class OutgoingAmqp implements Outgoing {
  private queueWebhooker: string
  private getConfig: getConfig
  constructor(getConfig: getConfig, queueWebhooker = UNOAPI_JOB_WEBHOOKER) {
    this.queueWebhooker = queueWebhooker
    this.getConfig = getConfig
  }

  public async formatAndSend(phone: string, to: string, message: object) {
    const data = completeCloudApiWebHook(phone, to, message)
    return this.send(phone, data)
  }

  public async send(phone: string, payload: object) {
    const config = await this.getConfig(phone)
    await amqpEnqueue(this.queueWebhooker, phone, { phone, webhooks: config.webhooks, payload, split: true })
  }

  public async sendHttp(phone: string, url: string, header: string, token: string, payload: object) {
    const webhook = { url, token, header }
    await amqpEnqueue(this.queueWebhooker, phone, { phone, webhook, payload, split: false })
  }
}
