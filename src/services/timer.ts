import { amqpPublish } from '../amqp'
import { UNOAPI_EXCHANGE_BROKER_NAME, UNOAPI_QUEUE_TIMER, UNOAPI_QUEUE_OUTGOING } from '../defaults'
import { v1 as uuid } from 'uuid'
import { setTimerExpired, getTimerExpired, delTimerExpired } from './redis'
import { getConfigRedis } from './config_redis'
import logger from './logger'


export const start = async (phone, to, timeout, message) => {
  const id = uuid()
  const payload = {
    phone, id, to, message
  }
  logger.debug('timer start phone %s to %s timeout %s', phone, to, timeout)
  await amqpPublish(
    UNOAPI_EXCHANGE_BROKER_NAME,
    UNOAPI_QUEUE_TIMER,
    phone,
    { payload }, 
    { type: 'topic', delay: timeout }
  )
}

export const stop = async (from, id) => {
  return setTimerExpired(from, id, true)
}

export const consumer = async (phone: string, data: object) => {
  const a = data as any
  const payload: any = a.payload
  const { id, message, to } = payload
  if (await getTimerExpired(phone, id)) {
    logger.debug('timer comsumer phone %s to %s id %s already deleted', phone, to, id)
    await delTimerExpired(phone, id)
  } else {
    logger.debug('timer consumer phone %s to %s id %s enqueue', phone, to, id)
    const config = await getConfigRedis(phone)
    const body = {
      messaging_product: 'whatsapp',
      to,
      type: 'text',
      text: {
        body: message
      } 
    }
    await amqpPublish(
      UNOAPI_EXCHANGE_BROKER_NAME,
      UNOAPI_QUEUE_OUTGOING, phone,
      { webhooks: config.webhooks, payload: body, split: true },
      { type: 'topic' }
    )
  }
}