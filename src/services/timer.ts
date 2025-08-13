import { amqpPublish } from '../amqp'
import { UNOAPI_EXCHANGE_BROKER_NAME, UNOAPI_QUEUE_TIMER } from '../defaults'
import { delTimerExpired, setTimerExpired } from './redis'
import logger from './logger'


export const start = async (phone, to, timeout, message) => {
  const payload = {
    phone, to, message
  }
  logger.debug('timer start phone %s to %s timeout %s', phone, to, timeout)
  await delTimerExpired(phone, to)
  await amqpPublish(
    UNOAPI_EXCHANGE_BROKER_NAME,
    UNOAPI_QUEUE_TIMER,
    phone,
    { payload },
    { type: 'topic', delay: timeout }
  )
}

export const stop = async (from, to) => {
  return setTimerExpired(from, to, true)
}