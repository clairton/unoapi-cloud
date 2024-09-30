import { Webhook } from '../services/config'
import { Outgoing } from '../services/outgoing'
import { amqpEnqueue } from '../amqp'
import { UNOAPI_DELAY_AFTER_FIRST_MESSAGE_WEBHOOK_MS, UNOAPI_JOB_WEBHOOKER } from '../defaults'
import { extractDestinyPhone } from '../services/transformer'
import logger from '../services/logger'
const  delays: Map<String, boolean> = new Map()

const sleep = (ms) => {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

const delayFunc = UNOAPI_DELAY_AFTER_FIRST_MESSAGE_WEBHOOK_MS ? async (phone, payload) => {
  let to = ''
  try {
    to = extractDestinyPhone(payload)
  } catch (error) {
    logger.error('Error on extract to from payload', error)
  }
  if (to) { 
    const key = `${phone}:${to}`
    if (!delays.get(key)) {
      delays.set(key, true);
      logger.debug(`Delay for first message %s`, UNOAPI_DELAY_AFTER_FIRST_MESSAGE_WEBHOOK_MS)
      sleep(UNOAPI_DELAY_AFTER_FIRST_MESSAGE_WEBHOOK_MS)
    }
  }
} :  async (_phone, _payload) => {}

export class WebhookerJob {
  private service: Outgoing
  constructor(service: Outgoing) {
    this.service = service
  }

  async consume(phone: string, data: object) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const a = data as any
    const payload: object = a.payload
    if (a.webhooks) {
      const webhooks: Webhook[] = a.webhooks
      Promise.all(
        webhooks.map((webhook) => {
          return amqpEnqueue(UNOAPI_JOB_WEBHOOKER, phone, { payload, webhook })
        }),
      )
    } else if (a.webhook) {
      await this.service.sendHttp(phone, a.webhook, payload, {})
      await delayFunc(phone, payload)
    } else {
      await this.service.send(phone, payload)
    }
  }
}
