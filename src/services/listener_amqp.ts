import { Listener } from './listener'
import { amqpEnqueue } from '../amqp'
import { UNOAPI_JOB_LISTENER } from '../defaults'

export class ListenerAmqp implements Listener {
  private queueListener: string

  constructor(queueListener = UNOAPI_JOB_LISTENER) {
    this.queueListener = queueListener
  }

  public async process(
    phone: string,
    messages: object[],
    type: 'qrcode' | 'status' | 'history' | 'append' | 'notify' | 'message' | 'update' | 'delete',
  ) {
    await amqpEnqueue(this.queueListener, phone, { phone, messages, type })
  }
}
