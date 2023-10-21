import amqp, { Connection, Channel, Options, ConsumeMessage } from 'amqplib'
import { AMQP_URL, UNOAPI_X_COUNT_RETRIES, UNOAPI_X_MAX_RETRIES, UNOAPI_MESSAGE_RETRY_LIMIT, UNOAPI_MESSAGE_RETRY_DELAY } from './defaults'
import logger from './services/logger'

const queueDelay = (queue: string) => `${queue}.delayed`
const queueDead = (queue: string) => `${queue}.dead`

let amqpConnection: Connection | undefined

const channels = new Map<string, Channel>()

export type CreateOption = {
  delay: number
  priority: number
}

export type EnqueueOption = CreateOption & {
  dead: boolean
  maxRetries: number
  countRetries: number
}

export const amqpConnect = async (amqpUrl = AMQP_URL) => {
  if (!amqpConnection) {
    logger.info(`Connecting RabbitMQ at ${amqpUrl}...`)
    amqpConnection = await amqp.connect(amqpUrl)
  } else {
    logger.info(`Already connected RabbitMQ!`)
  }

  amqpConnection.on('error', (err) => {
    logger.error('Connection Error %s', err)
    amqpConnection = undefined
  })
  amqpConnection.on('close', (err) => {
    logger.error('Connection Closed %s', err)
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
  amqpUrl = AMQP_URL,
  options: Partial<CreateOption> = { delay: UNOAPI_MESSAGE_RETRY_DELAY, priority: 0 },
) => {
  if (!channels.has(queue)) {
    const connection = await amqpConnect(amqpUrl)
    const channel = await amqpCreateChannel(connection, queue, options)
    channels.set(queue, channel)
    channel.on('error', (err) => {
      logger.error('Channel Error %s', err)
      channels.delete(queue)
    })
    channel.on('close', (err) => {
      logger.error('Channel Closed %s', err)
      channels.delete(queue)
    })
  }
  return channels.get(queue)
}

export const amqpCreateChannel = async (
  connection: Connection,
  queue: string,
  options: Partial<CreateOption> = { delay: UNOAPI_MESSAGE_RETRY_DELAY, priority: 0 },
) => {
  logger.info('Creating channel %s...', queue)
  const channel: Channel = await connection.createChannel()
  channel.prefetch(1)
  const queueDeadd = queueDead(queue)
  logger.info('Creating queue %s...', queueDeadd)
  await channel.assertQueue(queueDeadd, {
    durable: true,
  })
  const parameters = {
    'x-dead-letter-exchange': '',
    'x-dead-letter-routing-key': queueDeadd,
  }
  if (options.priority) {
    parameters['x-max-priority'] = options.priority
  }
  await channel.assertQueue(queue, {
    durable: true,
    arguments: parameters,
  })
  logger.info('Created queue %s!', queueDeadd)
  if (options.delay) {
    const queueDelayed = queueDelay(queue)
    logger.info('Creating queue %s...', queueDelayed)
    await channel.assertQueue(queueDelayed, {
      durable: true,
      arguments: {
        'x-dead-letter-exchange': '',
        'x-dead-letter-routing-key': queue,
      },
    })
    logger.info('Created queue %s!', queueDelayed)
  }
  logger.info('Created channel %s!', queue)
  return channel
}

export const amqpEnqueue = async (
  queue: string,
  payload: object,
  options: Partial<EnqueueOption> = { delay: 0, dead: false, maxRetries: UNOAPI_MESSAGE_RETRY_LIMIT, countRetries: 0, priority: 0 },
) => {
  const channel: Channel | undefined = await amqpGetChannel(queue, AMQP_URL, options)
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
  await channel.sendToQueue(queueName, Buffer.from(JSON.stringify(payload)), properties)
  logger.info('Enqueued at %s with payload %s and properties %s', queueName, JSON.stringify(payload), JSON.stringify(properties))
}

export const amqpConsume = async (
  queue: string,
  callback: (data: object) => Promise<void>,
  options: Partial<CreateOption> = { delay: UNOAPI_MESSAGE_RETRY_DELAY, priority: 0 },
) => {
  const channel = await amqpGetChannel(queue, AMQP_URL, options)
  if (!channel) {
    throw `Not create channel for queue ${queue}`
  }
  logger.info('Waiting for messages in queue %s', queue)
  const fn = async (payload: ConsumeMessage | null) => {
    if (!payload) {
      throw `payload not be null `
    }
    const content: string = payload.content.toString()
    const data = JSON.parse(content)
    try {
      logger.debug('Received queue %s message %s with headers %s', queue, content, JSON.stringify(payload.properties.headers))
      await callback(data)
      logger.debug('Ack message!')
      await channel.ack(payload)
    } catch (error) {
      logger.error(error)
      const headers = payload.properties.headers || {}
      const v = headers[UNOAPI_X_COUNT_RETRIES] || '0'
      const countRetries = parseInt(v) + 1
      const maxRetries = parseInt(headers[UNOAPI_X_MAX_RETRIES] || UNOAPI_MESSAGE_RETRY_LIMIT)
      if (countRetries >= maxRetries) {
        logger.info('Reject %s retries', countRetries)
        await amqpEnqueue(queue, data, { dead: true })
      } else {
        logger.info('Enqueue retry %s of %s', countRetries, maxRetries)
        await amqpEnqueue(queue, data, { delay: UNOAPI_MESSAGE_RETRY_DELAY, maxRetries, countRetries })
      }
      await channel.ack(payload)
    }
  }
  channel.consume(queue, fn)
}
