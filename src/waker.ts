import dotenv from 'dotenv'
dotenv.config({ path: process.env.DOTENV_CONFIG_PATH || '.env' })

import {
  AMQP_URL,
  UNOAPI_EXCHANGE_BRIDGE_NAME,
  UNOAPI_EXCHANGE_BROKER_NAME,
  UNOAPI_QUEUE_INCOMING,
  UNOAPI_QUEUE_LISTENER,
  UNOAPI_QUEUE_OUTGOING,
} from './defaults'
import { Channel, connect, ConsumeMessage } from 'amqplib'

import * as Sentry from '@sentry/node'
if (process.env.SENTRY_DSN) {
  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    sendDefaultPii: true,
  })
}

import logger from './services/logger'
import { queueDeadName, amqpPublish, extractRoutingKeyFromBindingKey } from './amqp'

logger.info('Starting with waker...')

const brokerQueues = [UNOAPI_QUEUE_OUTGOING]
const bridgeQueues = [UNOAPI_QUEUE_LISTENER, UNOAPI_QUEUE_INCOMING]

const queues = bridgeQueues.concat(brokerQueues)

const getExchangeName = queue => {
  if (bridgeQueues.includes(queue)) {
    return UNOAPI_EXCHANGE_BRIDGE_NAME
  } else if (brokerQueues.includes(queue)) {
    return UNOAPI_EXCHANGE_BROKER_NAME
  } else {
    throw `Unknow queue ${queue}`
  }
}

(async () => {
  return Promise.all(
    queues.map(async queue => {
      const amqpChannelModel = await connect(AMQP_URL)
      const queueName = queueDeadName(queue)
      const exchangeName = getExchangeName(queue)
      const exchangeType = exchangeName == UNOAPI_EXCHANGE_BRIDGE_NAME ? 'direct' : 'topic'
      logger.info('Waker exchange %s queue %s type %s', exchangeName, queueName, exchangeType)
      const channel: Channel = await amqpChannelModel?.createChannel()
      await channel.assertExchange(exchangeName, exchangeType, { durable: true })
      await channel.assertQueue(queueName, { durable: true })
      await channel.bindQueue(queueName, exchangeName, '*')
      channel.consume(queueName, async (payload: ConsumeMessage | null) => {
        if (!payload) {
          throw 'payload not be null'
        }
        await amqpPublish(
          exchangeName, 
          queue, 
          extractRoutingKeyFromBindingKey(payload.fields.routingKey),
          JSON.parse(payload.content.toString()),
          { type: exchangeType }
        )
        return channel.ack(payload)
      })
    })
  )
})()

process.on('uncaughtException', (reason: any) => {
  if (process.env.SENTRY_DSN) {
    Sentry.captureException(reason)
  }
  logger.error('uncaughtException waker: %s %s', reason, reason.stack)
  process.exit(1)
})

process.on('unhandledRejection', (reason: any, promise) => {
  if (process.env.SENTRY_DSN) {
    Sentry.captureException(reason)
  }
  logger.error('unhandledRejection: %s', reason.stack)
  logger.error('promise: %s', promise)
  process.exit(1)
})