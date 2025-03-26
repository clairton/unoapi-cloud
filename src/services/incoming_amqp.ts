import { Incoming } from './incoming'
import { amqpPublish } from '../amqp'
import { UNOAPI_EXCHANGE_BRIDGE_NAME, UNOAPI_QUEUE_INCOMING, UNOAPI_SERVER_NAME } from '../defaults'
import { v1 as uuid } from 'uuid'
import { jidToPhoneNumber } from './transformer'

export class IncomingAmqp implements Incoming {
  public async send(phone: string, payload: object, options: object = {}) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { status, type, to } = payload as any
    if (status) {
      options['type'] = 'direct'
      options['priority'] = 3 // update status is always middle important
      await amqpPublish(
        UNOAPI_EXCHANGE_BRIDGE_NAME,
        `${UNOAPI_QUEUE_INCOMING}.${UNOAPI_SERVER_NAME}`, 
        phone,
        { payload, options },
        options
      )
      return { ok: { success: true } }
    } else if (type) {
      const id = uuid()
      if (!options['priority']) {
        options['priority'] = 5 // send message without bulk is very important
      }
      options['type'] = 'direct'
      await amqpPublish(
        UNOAPI_EXCHANGE_BRIDGE_NAME,
        `${UNOAPI_QUEUE_INCOMING}.${UNOAPI_SERVER_NAME}`,
        phone,
        { payload, id, options }, 
        options
      )
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
      throw `Unknown incoming message ${JSON.stringify(payload)}`
    }
  }
}
