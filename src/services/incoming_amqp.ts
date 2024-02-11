import { Incoming } from './incoming'
import { amqpEnqueue } from '../amqp'
import { UNOAPI_JOB_INCOMING } from '../defaults'
import { v1 as uuid } from 'uuid'
import { jidToPhoneNumber } from './transformer'

export class IncomingAmqp implements Incoming {
  private queueName: string

  constructor(queueName: string = UNOAPI_JOB_INCOMING) {
    this.queueName = queueName
  }

  public async send(phone: string, payload: object, options: object) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { status, type, to } = payload as any
    if (status) {
      options['priority'] = 3 // update status is always middle important
      await amqpEnqueue(this.queueName, phone, { payload, options }, options)
      return { ok: { success: true } }
    } else if (type) {
      const id = uuid()
      if (!options['priority']) {
        options['priority'] = 5 // send message without bulk is very important
      }
      await amqpEnqueue(this.queueName, phone, { payload, id, options }, options)
      const ok = {
        messaging_product: 'whatsapp',
        contacts: [
          {
            wa_id: jidToPhoneNumber(to, ''),
          },
        ],
        messages: [
          {
            id,
          },
        ],
      }
      return { ok }
    } else {
      throw `Unknown ${JSON.stringify(payload)}`
    }
  }
}
