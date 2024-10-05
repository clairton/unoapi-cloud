import { amqpEnqueue } from '../amqp'
import { UNOAPI_JOB_RELOAD } from '../defaults'
import { Reload } from './reload'

export class ReloadAmqp extends Reload {
  private queueName: string

  constructor(queueName: string = UNOAPI_JOB_RELOAD) {
    super()
    this.queueName = queueName
  }

  public async run(phone: string) {
    await amqpEnqueue(this.queueName, '', { phone })
  }
}
