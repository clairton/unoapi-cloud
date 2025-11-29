import { amqpPublish } from '../amqp'
import { UNOAPI_EXCHANGE_BROKER_NAME, UNOAPI_QUEUE_TIMER } from '../defaults'
import { setLastTimer } from './redis'
import logger from './logger'

export const start = async (phone, to, timeout, message, type = 'text', nexts = []) => {
  const now = new Date().getTime()
  const payload = {
    phone,
    to,
    message,
    time: now,
    type,
    nexts,
  }
  logger.debug('timer start phone %s to %s timeout %s and nexts %s', phone, to, timeout, JSON.stringify(nexts))
  await setLastTimer(phone, to, now)
  await amqpPublish(UNOAPI_EXCHANGE_BROKER_NAME, UNOAPI_QUEUE_TIMER, phone, { payload }, { type: 'topic', delay: timeout })
}

export const stop = async (from, to) => {
  logger.debug('timer stop from %s to %s', from, to)
  return setLastTimer(from, to, new Date().getTime())
}
