import { Webhook } from '../services/config'
import { Outgoing } from '../services/outgoing'
import { amqpPublish } from '../amqp'
import { UNOAPI_DELAY_AFTER_FIRST_MESSAGE_WEBHOOK_MS, UNOAPI_EXCHANGE_BROKER_NAME, UNOAPI_QUEUE_OUTGOING } from '../defaults'
import { extractDestinyPhone } from '../services/transformer'
import logger from '../services/logger'
import { getConfig } from '../services/config'
import { isUpdateMessage } from '../services/transformer'

const  dUntil: Map<string, number> = new Map()
const  dVerified: Map<string, boolean> = new Map()

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
    if (!dVerified.get(key)) {
      let nextMessageTime = dUntil.get(key)
      const epochMS: number = Math.floor(Date.now());
      if (nextMessageTime === undefined) {
        nextMessageTime = epochMS + UNOAPI_DELAY_AFTER_FIRST_MESSAGE_WEBHOOK_MS
        dUntil.set(key, nextMessageTime);
        logger.debug(`Key %s First message`, key)
      } else {
        const thisMessageDelay: number = Math.floor(nextMessageTime - epochMS)
        if (thisMessageDelay > 0) {
          logger.debug(`Key %s Message delayed by %s ms`, key, thisMessageDelay)
          await sleep(thisMessageDelay)
        } else {
          logger.debug(`Key %s doesn't need more delays`, key)
          dVerified.set(key, true);
          dUntil.delete(key);
        }
      } 
    }
  }
} :  async (_phone, _payload) => {}

export class OutgoingJob {
  private service: Outgoing
  private getConfig: getConfig

  constructor(getConfig: getConfig, service: Outgoing) {
    this.service = service
    this.getConfig = getConfig
  }

  async consume(phone: string, data: object) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const a = data as any
    const payload: any = a.payload
    if (a.webhooks) {
      const webhooks: Webhook[] = a.webhooks
      await Promise.all(
        webhooks.map(async (webhook) => {
          return amqpPublish(UNOAPI_EXCHANGE_BROKER_NAME,  UNOAPI_QUEUE_OUTGOING, phone, { payload, webhook })
        }),
      )
    } else if (a.webhook) {
      await delayFunc(phone, payload)
      const config = await this.getConfig(phone)
      if (config.provider == 'forwarder') {
        const store = await config.getStore(phone, config)

        payload.entry[0].changes[0].value.metadata.phone_number_id = phone
        
        const { dataStore } = store
        if (isUpdateMessage(payload)) {
          payload.entry[0].changes[0].value.statuses = await Promise.all(
            payload.entry[0].changes[0].value.statuses.map(async status => {
              const currentId = status.id
              const unoId = await dataStore.loadUnoId(currentId)
              if (unoId) {
                status.id = unoId
              }
              return status
            })
          )
        } else {
          payload.entry[0].changes[0].value.messages = await Promise.all(
            payload.entry[0].changes[0].value.messages.map(async message => {
              if (['image', 'audio', 'document', 'video'].includes(message.type)) {
                const { mediaStore } = store
                message = await mediaStore.saveMediaForwarder(message)
              }
              // const currentId = message.id
              // const unoId = await dataStore.loadUnoId(currentId)
              // if (unoId) {
              //   message.id = unoId
              // }
              if (message.context && message.context.id) {
                const unoId = await dataStore.loadUnoId(message.context.id)
                if (unoId) {
                  message.context.id = unoId
                }
              }
              if (message.reaction && message.reaction.message_id) {
                const unoId = await dataStore.loadUnoId(message.reaction.message_id)
                if (unoId) {
                  message.reaction.id = unoId
                }
              }
              return message
            })
          )
        }
      }
      await this.service.sendHttp(phone, a.webhook, payload, {})
    }
  }
}
