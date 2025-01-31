import { eventType, Listener } from './listener'
import { EnqueueOption, amqpEnqueue } from '../amqp'
import { UNOAPI_JOB_LISTENER } from '../defaults'

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
  private queueListener: string

  constructor(queueListener = UNOAPI_JOB_LISTENER) {
    this.queueListener = queueListener
  }

  public async process(phone: string, messages: object[], type: eventType) {
    const options: Partial<EnqueueOption> = {}
    options.priority = priorities[type] || 5
    await amqpEnqueue(this.queueListener, phone, { messages, type }, options)
  }
}
