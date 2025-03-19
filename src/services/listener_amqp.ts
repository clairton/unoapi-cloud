import { eventType, Listener } from './listener'
import { PublishOption, amqpPublish } from '../amqp'
import { UNOAPI_JOB_LISTENER } from '../defaults'
import { getConfig } from '../services/config'

const priorities = {
  'qrcode': 5,
  'status': 3,
  'history': 0,
  'append': 5,
  'notify': 5,
  'message': 5,
  'update': 3,
  'delete': 3,
}

export class ListenerAmqp implements Listener {
  private getConfig: getConfig
  private queueListener: string

  constructor(getConfig: getConfig, queueListener = UNOAPI_JOB_LISTENER) {
    this.queueListener = queueListener
    this.getConfig = getConfig
  }

  public async process(phone: string, messages: object[], type: eventType) {
    const options: Partial<PublishOption> = {}
    options.priority = priorities[type] || 5
    const config = await this.getConfig(phone)
    await amqpPublish(`${this.queueListener}.${config.provider}`, phone, { messages, type }, options)
  }
}
