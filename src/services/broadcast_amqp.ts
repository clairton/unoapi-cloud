import { amqpEnqueue } from '../amqp'
import { UNOAPI_JOB_BROADCAST } from '../defaults'
import { Broadcast } from './broadcast'

export class BroadcastAmqp extends Broadcast {
  private queueName: string

  constructor(queueName: string = UNOAPI_JOB_BROADCAST) {
    super()
    this.queueName = queueName
  }

  public async send(phone: string, type: string, content: string) {
    const payload = { phone, type, content }
    await amqpEnqueue(this.queueName, '', payload)
  }
}
