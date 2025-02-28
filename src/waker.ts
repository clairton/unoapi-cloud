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
import { amqpConnect, queueDeadName, amqpEnqueue } from './amqp'

logger.info('Starting with waker...')
const queues = [UNOAPI_JOB_LISTENER, UNOAPI_JOB_INCOMING, UNOAPI_JOB_OUTGOING, UNOAPI_JOB_WEBHOOKER]

amqpConnect(AMQP_URL).then(async (connection) => {
  return queues.forEach(async queue => {
    const queueName = queueDeadName(queue)
    logger.info('Waker queue %s', queueName)
    const channel: Channel = await connection.createChannel()
    logger.info('Creating queue %s...', queueName)
    await channel.assertExchange(queueName, 'direct', { durable: true })
    channel.consume(queueName, async (payload: ConsumeMessage | null) => {
      if (!payload) {
        throw 'payload not be null'
      }
      await amqpEnqueue(queue, payload.fields.routingKey, JSON.parse(payload.content.toString()))
      return channel.ack(payload)
    })
  })
})
  
process.on('unhandledRejection', (reason: any, promise) => {
  logger.error('unhandledRejection: %s', reason.stack)
  logger.error('promise: %s', promise)
  throw reason
})
