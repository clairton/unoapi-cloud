import { eventType, Listener } from './listener'
import { PublishOption, amqpPublish } from '../amqp'
import { UNOAPI_EXCHANGE_BRIDGE_NAME, UNOAPI_QUEUE_LISTENER } from '../defaults'

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

const delay = new Map<string, number>()

const delays = {
  'qrcode': _ => 0,
  'status': _ => 0,
  'history': (phone: string) => {
    const current = delay.get(phone)
    if (current) {
      delay.set(phone, current + 1000)
      return current
    } else {
      delay.set(phone, 1000)
      return 0
    }
  },
  'append': _ => 0,
  'notify': _ => 0,
  'message': _ => 0,
  'update': _ => 0,
  'delete': _ => 0,
}


export class ListenerAmqp implements Listener {
  public async process(phone: string, messages: object[], type: eventType) {
    const options: Partial<PublishOption> = {}
    options.priority = options.priority || priorities[type] || 5
    options.delay = options.delay || delays[type](phone) || 0
    options.type = 'direct'
    await amqpPublish(UNOAPI_EXCHANGE_BRIDGE_NAME, UNOAPI_QUEUE_LISTENER, phone, { messages, type }, options)
  }
}
