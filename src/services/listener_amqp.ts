import { Listener } from './listener'
import { EnqueueOption, amqpEnqueue } from '../amqp'
import { UNOAPI_JOB_LISTENER } from '../defaults'

export class ListenerAmqp implements Listener {
  private queueListener: string

  private static priorities = {
    qrcode: 5,
    status: 3,
    history: 0,
    append: 5,
    notify: 5,
    message: 5,
    update: 3,
    delete: 3,
  }

  constructor(queueListener = UNOAPI_JOB_LISTENER) {
    this.queueListener = queueListener
  }

  public async process(
    phone: string,
    messages: object[],
    type: 'qrcode' | 'status' | 'history' | 'append' | 'notify' | 'message' | 'update' | 'delete',
  ) {
    const options: Partial<EnqueueOption> = {}
    options.priority = ListenerAmqp.priorities[type]
    await amqpEnqueue(this.queueListener, phone, { messages, type }, options)
  }
}
