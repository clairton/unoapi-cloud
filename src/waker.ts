import dotenv from 'dotenv'
dotenv.config({ path: process.env.DOTENV_CONFIG_PATH || '.env' })

import {
  AMQP_URL,
  UNOAPI_EXCHANGE_BRIDGE_NAME,
  UNOAPI_EXCHANGE_BROKER_NAME,
  UNOAPI_JOB_INCOMING,
  UNOAPI_JOB_LISTENER,
  UNOAPI_JOB_OUTGOING,
  UNOAPI_JOB_WEBHOOKER,
} from './defaults'
import { Channel, ConsumeMessage } from 'amqplib'

import logger from './services/logger'
import { amqpConnect, queueDeadName, amqpPublish, extractRoutingKeyFromBindingKey, ExchagenType } from './amqp'

logger.info('Starting with waker...')

const bridgeQueue = [UNOAPI_JOB_INCOMING, UNOAPI_JOB_OUTGOING]
const brokerQueue = [UNOAPI_JOB_LISTENER, UNOAPI_JOB_WEBHOOKER]

const queues = bridgeQueue.concat(brokerQueue)

const getExchangeName = queue => {
  if (bridgeQueue.includes(queue)) {
    return UNOAPI_EXCHANGE_BRIDGE_NAME
  } else if (bridgeQueue.includes(queue)) {
    return UNOAPI_EXCHANGE_BROKER_NAME
  } else {
    throw `Unknow queue ${queue}`
  }
}
const getExchangeType = (queue): ExchagenType => {
  if (bridgeQueue.includes(queue)) {
    return 'direct'
  } else if (bridgeQueue.includes(queue)) {
    return 'topic'
  } else {
    throw `Unknow queue ${queue}`
  }
}

amqpConnect(AMQP_URL).then(async (connection) => {
  return queues.forEach(async queue => {
    const exchangeName = queueDeadName(queue)
    logger.info('Waker exchange %s', exchangeName)
    const channel: Channel = await connection.createChannel()
    logger.info('Creating queue %s...', exchangeName)
    await channel.assertExchange(exchangeName, getExchangeName(queue), { durable: true })
    channel.consume(exchangeName, async (payload: ConsumeMessage | null) => {
      if (!payload) {
        throw 'payload not be null'
      }
      await amqpPublish(
        getExchangeName(queue), 
        queue, 
        extractRoutingKeyFromBindingKey(payload.fields.routingKey),
        JSON.parse(payload.content.toString()), {
          type: getExchangeType(queue)
        }
      )
      return channel.ack(payload)
    })
  })
})
  
process.on('unhandledRejection', (reason: any, promise) => {
  logger.error('unhandledRejection: %s', reason.stack)
  logger.error('promise: %s', promise)
  throw reason
})
