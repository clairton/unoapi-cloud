import dotenv from 'dotenv'
dotenv.config({ path: process.env.DOTENV_CONFIG_PATH || '.env' })

import {
  AMQP_URL,
  UNOAPI_JOB_INCOMING,
  UNOAPI_JOB_LISTENER,
  UNOAPI_JOB_OUTGOING,
  UNOAPI_JOB_WEBHOOKER,
} from './defaults'
import { Channel, ConsumeMessage } from 'amqplib'

import logger from './services/logger'
import { amqpConnect, exchangeDeadName, amqpPublish } from './amqp'

logger.info('Starting with waker...')
const queues = [UNOAPI_JOB_LISTENER, UNOAPI_JOB_INCOMING, UNOAPI_JOB_OUTGOING, UNOAPI_JOB_WEBHOOKER]

amqpConnect(AMQP_URL).then(async (connection) => {
  return queues.forEach(async queue => {
    const exchangeName = exchangeDeadName(queue)
    logger.info('Waker exchange %s', exchangeName)
    const channel: Channel = await connection.createChannel()
    logger.info('Creating queue %s...', exchangeName)
    await channel.assertExchange(exchangeName, 'direct', { durable: true })
    channel.consume(exchangeName, async (payload: ConsumeMessage | null) => {
      if (!payload) {
        throw 'payload not be null'
      }
      await amqpPublish(queue, payload.fields.routingKey, JSON.parse(payload.content.toString()))
      return channel.ack(payload)
    })
  })
})
  
process.on('unhandledRejection', (reason: any, promise) => {
  logger.error('unhandledRejection: %s', reason.stack)
  logger.error('promise: %s', promise)
  throw reason
})
