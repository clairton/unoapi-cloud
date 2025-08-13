import { amqpPublish } from '../amqp'
import { UNOAPI_EXCHANGE_BROKER_NAME, UNOAPI_QUEUE_TIMER } from '../defaults'
import { v1 as uuid } from 'uuid'
import { setTimerExpired } from './redis'
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
  return id
}

export const stop = async (from, id) => {
  return setTimerExpired(from, id, true)
}