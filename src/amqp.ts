import amqp, { Connection, Channel, Options, ConsumeMessage } from 'amqplib'
import {
  AMQP_URL,
  UNOAPI_X_COUNT_RETRIES,
  UNOAPI_X_MAX_RETRIES,
  UNOAPI_MESSAGE_RETRY_LIMIT,
  UNOAPI_MESSAGE_RETRY_DELAY,
  UNOAPI_JOB_BIND,
  NOTIFY_FAILED_MESSAGES,
  UNOAPI_JOB_NOTIFICATION,
  IGNORED_CONNECTIONS_NUMBERS,
} from './defaults'
import logger from './services/logger'
import { version } from '../package.json'

const queueDelay = (queue: string) => `${queue}.delayed`
const queueDead = (queue: string) => `${queue}.dead`

let amqpConnection: Connection | undefined

const channels = new Map<string, Channel>()
const routes = new Map<string, boolean>()

export type CreateOption = {
  delay: number
  priority: number
  notifyFailedMessages: boolean
  prefetch: number
}

export type EnqueueOption = CreateOption & {
  dead: boolean
  maxRetries: number
  countRetries: number
}

export interface ConsumeCallback {
  (phone: string, data: object, options?: { countRetries: number; maxRetries: number }): Promise<void>
}

export const amqpConnect = async (amqpUrl = AMQP_URL) => {
  if (!amqpConnection) {
    logger.info(`Connecting RabbitMQ at ${amqpUrl}...`)
    amqpConnection = await amqp.connect(amqpUrl)
  } else {
    logger.info(`Already connected RabbitMQ!`)
  }

  amqpConnection.on('error', (err) => {
    logger.error(err, 'Connection Error')
    amqpConnection = undefined
  })
  amqpConnection.on('close', (err) => {
    logger.error(err, 'Connection Closed')
    amqpConnection = undefined
  })

  return amqpConnection
}

export const amqpDisconnect = async (connection: Connection) => {
  logger.debug('Disconnecting RabbitMQ')
  return connection.close()
}

export const amqpGetChannel = async (
  queue: string,
  phone: string,
  amqpUrl = AMQP_URL,
  options: Partial<CreateOption> = { delay: UNOAPI_MESSAGE_RETRY_DELAY, priority: 0 },
) => {
  if (!channels.has(queue)) {
    const connection = await amqpConnect(amqpUrl)
    const channel = await amqpCreateChannel(connection, queue, options)
    channels.set(queue, channel)
    channel.on('error', (err) => {
      logger.error(err, 'Channel Error')
      channels.delete(queue)
    })
    channel.on('close', (err) => {
      logger.error(err, 'Channel Closed')
      channels.delete(queue)
    })
  }
  if (phone && !routes.get(phone)) {
    await amqpEnqueue(UNOAPI_JOB_BIND, '', { phone })
    routes.set(phone, true)
  }
  return channels.get(queue)
}

export const amqpCreateChannel = async (
  connection: Connection,
  queue: string,
  options: Partial<CreateOption> = { delay: UNOAPI_MESSAGE_RETRY_DELAY, priority: 0, notifyFailedMessages: NOTIFY_FAILED_MESSAGES },
) => {
  logger.info('Creating channel %s...', queue)
  const channel: Channel = await connection.createChannel()
  channel.prefetch(options.prefetch || 1)
  const queueDeadd = queueDead(queue)
  logger.info('Creating queue %s...', queueDeadd)
  await channel.assertExchange(queueDeadd, 'direct', {
    durable: true,
  })
  const parameters = { 'x-dead-letter-exchange': queueDeadd }
  if (options.priority) {
    parameters['x-max-priority'] = options.priority
  }
  await channel.assertExchange(queue, 'direct', {
    durable: true,
    arguments: parameters,
  })
  logger.info('Created queue %s!', queueDeadd)
  // if (options.delay) {
  const queueDelayed = queueDelay(queue)
  logger.info('Creating queue %s...', queueDelayed)
  await channel.assertExchange(queueDelayed, 'direct', {
    durable: true,
    arguments: { 'x-dead-letter-exchange': queue },
  })
  logger.info('Created queue %s!', queueDelayed)
  // }
  logger.info('Created channel %s!', queue)
  return channel
}

export const amqpEnqueue = async (
  queue: string,
  phone: string,
  payload: object,
  options: Partial<EnqueueOption> = { delay: 0, dead: false, maxRetries: UNOAPI_MESSAGE_RETRY_LIMIT, countRetries: 0, priority: 0 },
) => {
  const channel: Channel | undefined = await amqpGetChannel(queue, phone, AMQP_URL, options)
  if (!channel) {
    throw `Not create channel for queue ${queue}`
  }
  const { delay, dead, maxRetries, countRetries } = options
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const headers: any = {}
  headers[UNOAPI_X_COUNT_RETRIES] = countRetries
  headers[UNOAPI_X_MAX_RETRIES] = maxRetries
  let queueName
  const properties: Options.Publish = {
    persistent: true,
    deliveryMode: 2,
    headers,
  }
  if (options.priority) {
    properties.priority = options.priority
  }
  if (delay) {
    queueName = queueDelay(queue)
    const delayMilliseconds: number = typeof delay == 'number' ? delay : UNOAPI_MESSAGE_RETRY_DELAY
    properties.expiration = delayMilliseconds
  } else if (dead) {
    queueName = queueDead(queue)
  } else {
    queueName = queue
  }
  await channel.publish(queueName, phone, Buffer.from(JSON.stringify(payload)), properties)
  logger.info('Enqueued at %s with phone: %s, payload: %s, properties: %s', queueName, phone, JSON.stringify(payload), JSON.stringify(properties))
}

export const amqpConsume = async (
  queue: string,
  phone: string,
  callback: ConsumeCallback,
  options: Partial<CreateOption> = { delay: UNOAPI_MESSAGE_RETRY_DELAY, priority: 0, notifyFailedMessages: NOTIFY_FAILED_MESSAGES },
) => {
  const channel = await amqpGetChannel(queue, phone, AMQP_URL, options)
  if (!channel) {
    throw `Not create channel for queue ${queue}`
  }
  logger.info('Waiting for message %s in queue %s', phone, queue)
  const fn = async (payload: ConsumeMessage | null) => {
    if (!payload) {
      throw `payload not be null `
    }
    const content: string = payload.content.toString()
    const phone = payload.fields.routingKey
    if (IGNORED_CONNECTIONS_NUMBERS.includes(phone)) {
      logger.info(`Ignore messages from ${phone}`)
    }
    const data = JSON.parse(content)
    const headers = payload.properties.headers || {}
    const maxRetries = parseInt(headers[UNOAPI_X_MAX_RETRIES] || UNOAPI_MESSAGE_RETRY_LIMIT)
    const countRetries = parseInt(headers[UNOAPI_X_COUNT_RETRIES] || '0') + 1
    try {
      logger.debug('Received in %s with phone: %s, message: %s with headers: %s', queue, phone, content, JSON.stringify(payload.properties.headers))
      await callback(phone, data, { countRetries, maxRetries })
      logger.debug('Ack message!')
      await channel.ack(payload)
    } catch (error) {
      logger.error(error)
      if (countRetries >= maxRetries) {
        logger.info('Reject %s retries', countRetries)
        if (options.notifyFailedMessages) {
          logger.info('Sending error to whatsapp...')
          await amqpEnqueue(
            UNOAPI_JOB_NOTIFICATION,
            phone,
            {
              payload: {
                to: phone,
                type: 'text',
                text: {
                  body: `Unoapi version ${version} message failed in queue ${queue}\n\nstack trace: ${error.stack}\n\n\nerror: ${
                    error.message
                  }\n\ndata: ${JSON.stringify(data, undefined, 2)}`,
                },
              },
            },
            { maxRetries: 0 },
          )
          logger.info('Sent error to whatsapp!')
        }
        await amqpEnqueue(queue, phone, data, { dead: true })
      } else {
        logger.info('Enqueue retry %s of %s', countRetries, maxRetries)
        await amqpEnqueue(queue, phone, data, { delay: UNOAPI_MESSAGE_RETRY_DELAY * countRetries, maxRetries, countRetries })
      }
      await channel.ack(payload)
    }
  }

  const queueDeadd = queueDead(queue)
  const channelQueueDead = await channel.assertQueue(queueDeadd, { durable: true })
  await channel.bindQueue(channelQueueDead.queue, queueDeadd, phone)

  const channelQueue = await channel.assertQueue(queue, {
    durable: true,
    // exclusive: true,
    arguments: {
      'x-dead-letter-exchange': queueDeadd,
      // 'x-dead-letter-routing-key': phone,
    },
  })
  await channel.bindQueue(channelQueue.queue, queue, phone)

  const queueDelayed = queueDelay(queue)
  const channelQueueDelayed = await channel.assertQueue(queueDelayed, {
    durable: true,
    arguments: {
      'x-dead-letter-exchange': queue,
      // 'x-dead-letter-routing-key': phone,
    },
  })
  await channel.bindQueue(channelQueueDelayed.queue, queueDelayed, phone)

  channel.consume(channelQueue.queue, fn)
}
