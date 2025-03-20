import { amqpPublish } from '../amqp'
import { UNOAPI_EXCHANGE_BROKER_NAME, UNOAPI_JOB_BROADCAST } from '../defaults'
import { Broadcast } from './broadcast'

export class BroadcastAmqp extends Broadcast {
  public async send(phone: string, type: string, content: string) {
    const payload = { phone, type, content }
    await amqpPublish(UNOAPI_EXCHANGE_BROKER_NAME, UNOAPI_JOB_BROADCAST, '', payload)
  }
}
