import { amqpPublish } from '../amqp'
import { UNOAPI_EXCHANGE_BROKER_NAME, UNOAPI_QUEUE_TIMER } from '../defaults'
import { setLastTimer } from './redis'
import logger from './logger'


export const start = async (phone, to, timeout, message, nexts = []) => {
  const now = new Date()
  const payload = {
    phone, to, message, time: now.toISOString(), nexts
  }
  logger.debug('timer start phone %s to %s timeout %s', phone, to, timeout)
  await setLastTimer(phone, to, now)
  await amqpPublish(
    UNOAPI_EXCHANGE_BROKER_NAME,
    UNOAPI_QUEUE_TIMER,
    phone,
    { payload },
    { type: 'topic', delay: timeout }
  )
}

export const stop = async (from, to) => {
  return setLastTimer(from, to, new Date())
}