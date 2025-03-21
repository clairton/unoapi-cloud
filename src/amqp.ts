import { connect, Connection, Channel, Queue, Options, ConsumeMessage } from 'amqplib'
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
  VALIDATE_ROUTING_KEY,
  CONSUMER_TIMEOUT_MS,
  UNOAPI_SERVER_NAME,
  UNOAPI_EXCHANGE_BROKER_NAME,
} from './defaults'
import logger from './services/logger'
import { version } from '../package.json'

const withTimeout = (millis, error, promise) => {
  let timeoutPid
  const timeout = new Promise((_resolve, reject) =>
    timeoutPid = setTimeout(
      () => reject(error),
      millis))
  return Promise.race([
    promise,
    timeout
  ]).finally(() => {
    if (timeoutPid) {
      clearTimeout(timeoutPid)
    }
  })
}

const queueDelayedName = (queue: string) => `${queue}.delayed`
export const queueDeadName = (queue: string) => `${queue}.dead`

let amqpConnection: Connection | undefined
let amqpChannel: Channel | undefined

type QueueObject = {
  queueMain: Queue
  queueDead: Queue
  queueDelayed: Queue
}
const exchanges = new Map<string, boolean>()
const queues = new Map<string, QueueObject>()
const routes = new Map<string, boolean>()
const consumers = new Map<string, boolean>()

export const extractRoutingKeyFromBindingKey = (bindingKey) => {
  const parts = bindingKey.split('.')
  return parts[parts.length - 1]
}

const validateFormatNumber = (v: string) => {
  if (![UNOAPI_SERVER_NAME].includes(v) && '' != v && '.*' != v && !/^\d+$/.test(v)) {
    throw `${v} is not a number`
  }
}
const validateRoutingKey = VALIDATE_ROUTING_KEY ? validateFormatNumber : (_) => _

export type ExchagenType = 'direct' | 'topic'

export type CreateOption = {
  delay: number
  priority: number
  notifyFailedMessages: boolean
  prefetch: number
  type: ExchagenType
}

export type PublishOption = CreateOption & {
  dead: boolean
  maxRetries: number
  countRetries: number
}

export interface ConsumeCallback {
  (routingKey: string, data: object, options?: { countRetries: number; maxRetries: number }): Promise<void>
}

export const amqpConnect = async (amqpUrl = AMQP_URL) => {
  if (!amqpConnection) {
    logger.info(`Connecting RabbitMQ at ${amqpUrl}...`)
    amqpConnection = await connect(amqpUrl)
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

export const amqpGetChannel = async () => {
  if (!amqpChannel) {
    logger.info('Creating channel...')
    const connection = await amqpConnect()
    amqpChannel = await connection.createChannel()
    logger.info('Created channel!')
  }
  return amqpChannel
}

export const amqpGetExchange = async (exchange: string, type: ExchagenType, prefetch: number, dle = '') => {
  if (!exchanges.get(exchange)) {
    logger.info('Creating exchange...')
    const channel = await amqpGetChannel()
    channel.prefetch(prefetch)
    const values = { 'x-max-priority': 5 }
    if (dle) {
      values['x-dead-letter-exchange'] = dle
    }
    await channel.assertExchange(exchange, type, { durable: true,  arguments: values})
    logger.info('Created exchange!')
    exchanges.set(exchange, true)
  }
}

const bindingKey = (amqpQueue, routingKey) => {
  return `${amqpQueue.queue}${routingKey ? `.${routingKey}` : ''}`
}

const bindQueue = async (channel, exchangeName, amqpQueue, routingKey) => {
  const destiny = bindingKey(amqpQueue, routingKey)
  logger.info('Bind exchange %s binding key %s', exchangeName, destiny)
  await channel.bindQueue(amqpQueue.queue, exchangeName, destiny)
  return destiny
}

export const amqpGetQueue = async (
  exchange: string,
  queue: string,
  routingKey: string,
  options: Partial<CreateOption> = {
    delay: 0,
    priority: 0,
    notifyFailedMessages: NOTIFY_FAILED_MESSAGES,
    type: 'topic',
    prefetch: 1
  },
): Promise<QueueObject> => {
  if (!queues.get(queue)) {
    const exchangeDelayedID = queueDelayedName(exchange)
    await amqpGetExchange(exchange, options.type!, options.prefetch!)
    await amqpGetExchange(exchangeDelayedID, options.type!, options.prefetch!, exchange)
    const channel = await amqpGetChannel()
    logger.info('Creating queue %s...', queue)
    const queueMain = await channel.assertQueue(queue, { durable: true })
    const queueDeadId = queueDeadName(queue)
    const queueDead = await channel.assertQueue(queueDeadId, { durable: true })
    // await bindQueue(channel, exchange, queueDead, '*')
    const queueDelayedID = queueDelayedName(queue)
    const queueDelayedOptions = {
      durable: true,
      arguments: { 
        // 'x-dead-letter-queue': queue,
        'x-dead-letter-exchange': exchange
      },
    }
    // const destiny = bindingKey(queueMain, routingKey)
    // const queueDelayedOptions = {
    //   durable: true,
    //   arguments: { 'x-dead-letter-routing-key': destiny },
    // }
    const queueDelayed = await channel.assertQueue(queueDelayedID, queueDelayedOptions)
    queues.set(queue, { queueMain, queueDead, queueDelayed })
    logger.info('Created queue %s!', queue)
  }


  validateRoutingKey(routingKey)
  if (/^\d+$/.test(routingKey) && !routes.get(routingKey)) {
    await amqpPublish(exchange, UNOAPI_JOB_BIND, UNOAPI_SERVER_NAME, { routingKey })
    routes.set(routingKey, true)
  }
  return queues.get(queue)!
}

export const amqpPublish = async (
  exchange: string,
  queue: string,
  routingKey: string,
  payload: object,
  options: Partial<PublishOption> = { 
    delay: 0,
    dead: false,
    maxRetries: UNOAPI_MESSAGE_RETRY_LIMIT,
    countRetries: 0,
    priority: 0,
    type: 'topic'
  },
) => {
  validateRoutingKey(routingKey)
  const channel = await amqpGetChannel()
  await amqpGetExchange(exchange, options.type!, options.prefetch!)
  const { queueMain, queueDead, queueDelayed } = await amqpGetQueue(exchange, queue, routingKey, options)
  const { delay, dead, maxRetries, countRetries } = options
  const headers: any = {}
  headers[UNOAPI_X_COUNT_RETRIES] = countRetries
  headers[UNOAPI_X_MAX_RETRIES] = maxRetries
  let queueUsed
  let exchangeUsed = exchange
  const properties: Options.Publish = {
    persistent: true,
    deliveryMode: 2,
    headers,
  }
  if (options.priority) {
    properties.priority = options.priority
  }
  if (delay) {
    queueUsed = queueDelayed
    const delayMilliseconds: number = typeof delay == 'number' ? delay : UNOAPI_MESSAGE_RETRY_DELAY
    properties.expiration = delayMilliseconds
    exchangeUsed = queueDelayedName(exchange)
  } else if (dead) {
    queueUsed = queueDead
  } else {
    queueUsed = queueMain
  }
  const destiny = bindingKey(queueUsed, routingKey)
  await channel.publish(exchangeUsed, destiny, Buffer.from(JSON.stringify(payload)), properties)
  logger.debug(
    'Published at exchange %s, with binding key: %s, payload: %s, properties: %s',
    exchangeUsed,
    destiny,
    JSON.stringify(payload),
    JSON.stringify(properties)
  )
}

export const amqpConsume = async (
  exchange: string,
  queue: string,
  routingKey: string,
  callback: ConsumeCallback,
  options: Partial<CreateOption> = {
    delay: UNOAPI_MESSAGE_RETRY_DELAY, 
    priority: 0,
    notifyFailedMessages: NOTIFY_FAILED_MESSAGES,
    type: 'topic'
  },
) => {
  validateRoutingKey(routingKey)
  await amqpGetExchange(exchange, options.type!, options.prefetch!)
  const exchangeDelayed = queueDelayedName(exchange)
  const channel = await amqpGetChannel()
  const { queueMain, queueDelayed } = await amqpGetQueue(exchange, queue, routingKey, options)
  const fn = async (payload: ConsumeMessage | null) => {
    if (!payload) {
      throw `payload not be null `
    }
    const content: string = payload.content.toString()
    const routingKey = extractRoutingKeyFromBindingKey(payload.fields.routingKey)
    const data = JSON.parse(content)
    const headers = payload.properties.headers || {}
    const maxRetries = parseInt(headers[UNOAPI_X_MAX_RETRIES] || UNOAPI_MESSAGE_RETRY_LIMIT)
    const countRetries = parseInt(headers[UNOAPI_X_COUNT_RETRIES] || '0') + 1
    try {
      logger.debug('Received in queue %s, with routing key: %s, with message: %s with headers: %s', queue, routingKey, content, JSON.stringify(payload.properties.headers))
      if (IGNORED_CONNECTIONS_NUMBERS.includes(routingKey)) {
        logger.info(`Ignore messages from ${routingKey}`)
      } else {
        const timeoutError = `timeout ${CONSUMER_TIMEOUT_MS} is exceeded consume queue: ${queue}, routing key: ${routingKey}, payload: ${content}`
        await withTimeout(CONSUMER_TIMEOUT_MS, timeoutError, callback(routingKey, data, { countRetries, maxRetries }))
      }
      logger.debug('Ack message!')
      await channel.ack(payload)
    } catch (error) {
      logger.error(error, 'Error on consume %s', queue)
      if (countRetries >= maxRetries) {
        logger.info('Reject %s retries', countRetries)
        if (options.notifyFailedMessages) {
          logger.info('Sending error to whatsapp...')
          await amqpPublish(
            UNOAPI_EXCHANGE_BROKER_NAME,
            UNOAPI_JOB_NOTIFICATION,
            routingKey,
            {
              payload: {
                to: routingKey,
                type: 'text',
                text: {
                  body: `Unoapi version ${version} message failed in queue ${queue}\n\nstack trace: ${error.stack}\n\n\nerror: ${error.message
                    }\n\ndata: ${JSON.stringify(data, undefined, 2)}`,
                },
              },
            },
            { maxRetries: 0 },
          )
          logger.info('Sent error to whatsapp!')
        }
        await amqpPublish(exchange, queue, routingKey, data, { dead: true })
      } else {
        await amqpGetExchange(exchangeDelayed, options.type!, options.prefetch!, exchange)
        logger.info('Publish retry %s of %s', countRetries, maxRetries)
        await amqpPublish(exchange, queue, routingKey, data, { delay: 60000, maxRetries, countRetries })
      }
      await channel.ack(payload)
    }
  }

  const bindingKey = await bindQueue(channel, exchange, queueMain, routingKey)
  const bindingKeyDelayed = await bindQueue(channel, exchange, queueDelayed, routingKey)
  const bindingKeyDelayedExchange = await bindQueue(channel, exchangeDelayed, queueDelayed, routingKey)

  channel.on('close', () => {
    channel.unbindQueue(queueMain.queue, exchange, bindingKey)
    channel.unbindQueue(queueDelayed.queue, exchange, bindingKeyDelayed)
    channel.unbindQueue(queueDelayed.queue, exchangeDelayed, bindingKeyDelayedExchange)
  })
  if (!consumers.get(queue)) {
    consumers.set(queue, true)
    channel.consume(queue, fn)
  }
  logger.info('Waiting for message in queue %s with binding key %s', queue, bindingKey)
}
