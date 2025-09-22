import { connect, Connection, Channel, Replies, ChannelModel, Options, ConsumeMessage } from 'amqplib'
import {
  AMQP_URL,
  UNOAPI_X_COUNT_RETRIES,
  UNOAPI_X_MAX_RETRIES,
  UNOAPI_MESSAGE_RETRY_LIMIT,
  UNOAPI_MESSAGE_RETRY_DELAY,
  UNOAPI_QUEUE_BIND,
  NOTIFY_FAILED_MESSAGES,
  UNOAPI_QUEUE_NOTIFICATION,
  IGNORED_CONNECTIONS_NUMBERS,
  VALIDATE_ROUTING_KEY,
  CONSUMER_TIMEOUT_MS,
  UNOAPI_SERVER_NAME,
  UNOAPI_EXCHANGE_BROKER_NAME,
  UNOAPI_EXCHANGE_BRIDGE_NAME,
  IGNORED_TO_NUMBERS
} from './defaults'
import logger from './services/logger'
import { version } from '../package.json'
import { extractDestinyPhone } from './services/transformer'

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

export const queueDeadName = (queue: string) => `${queue}.dead`
export const queueDelayedName = (queue: string) => `${queue}.delayed`

let amqpChannelModel: ChannelModel | undefined
let amqpChannel: Channel | undefined
let amqpConnection: Connection | undefined

type QueueObject = {
  queueMain: Replies.AssertQueue
  queueDead: Replies.AssertQueue
  queueDelayed: Replies.AssertQueue
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

export type ExchangeType = 'direct' | 'topic'

export type CreateOption = {
  delay: number
  priority: number
  notifyFailedMessages: boolean
  prefetch: number
  type: ExchangeType
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
  if (!amqpChannelModel) {
    logger.info(`Connecting RabbitMQ at ${amqpUrl}...`)
    amqpChannelModel = await connect(amqpUrl)
    amqpConnection = amqpChannelModel.connection
  } else {
    logger.info(`Already connected RabbitMQ!`)
  }

  amqpChannelModel.on('error', (err) => {
    logger.error(err, 'Connection Error')
    amqpChannelModel = undefined
  })
  amqpChannelModel.on('close', (err) => {
    logger.error(err, 'Connection Closed')
    amqpChannelModel = undefined
  })

  return amqpChannelModel
}

export const amqpDisconnect = async (amqpChannelModel: ChannelModel) => {
  logger.debug('Disconnecting RabbitMQ')
  return amqpChannelModel?.close()
}

export const amqpGetChannel = async () => {
  if (!amqpChannel) {
    logger.info('Creating channel...')
    await amqpConnect()
    amqpChannel = await amqpChannelModel?.createChannel()
    logger.info('Created channel!')
  }
  return amqpChannel
}

export const amqpGetExchange = async (exchange: string, type: ExchangeType, prefetch: number) => {
  if (!exchanges.get(exchange)) {
    logger.info('Creating exchange %s...', exchange)
    const channel = await amqpGetChannel()
    await channel?.prefetch(prefetch)
    await channel?.assertExchange(exchange, type, { durable: true,  arguments: { 'x-max-priority': 5 }})

    const exchangeDeadId = queueDeadName(exchange)
    await amqpChannel?.assertExchange(exchangeDeadId, 'topic', { durable: true })

    const exchangeDelayedId = queueDelayedName(exchange)
    await amqpChannel?.assertExchange(exchangeDelayedId, 'topic', { durable: true , arguments: {
      'x-dead-letter-exchange': exchange
    }})
    logger.info('Created exchange %s!', exchange)
    exchanges.set(exchange, true)
  }
}

const bindingKey = (queueName, routingKey) => {
  return `${queueName}${routingKey ? `.${routingKey}` : ''}`
}

const bindQueue = async (channel, exchangeName, queueName, routingKey, delayed = false) => {
  const queueNameToBind = delayed ? queueDelayedName(queueName) : queueName
  const destiny = bindingKey(queueNameToBind, routingKey)
  logger.info('Bind exchange %s binding key %s', exchangeName, destiny)
  await channel.bindQueue(queueName, exchangeName, destiny)
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
    await amqpGetExchange(exchange, options.type!, options.prefetch!)
    const channel = await amqpGetChannel()
    logger.info('Creating queue %s...', queue)
    const queueMain = await channel?.assertQueue(queue, { durable: true })!
    let deadLetterExchange = exchange

    const queueDeadId = queueDeadName(queue)
    const exchangeDeadId = queueDeadName(exchange)
    const queueDead = await channel?.assertQueue(queueDeadId, { durable: true })!
    await amqpChannel?.bindQueue(queueDeadId, exchangeDeadId, `${queueDeadId}.*`)

    const exchangeDelayedId = queueDelayedName(exchange)
    const queueDelayedId = queueDelayedName(queue)
    const queueDelayed = await amqpChannel?.assertQueue(queueDelayedId, { durable: true, arguments: {
      'x-dead-letter-exchange': deadLetterExchange
    }})!
    await amqpChannel?.bindQueue(queueDelayedId, exchangeDelayedId, `${queueDelayedId}.*`)

    queues.set(queue, { queueMain, queueDead, queueDelayed })
    logger.info('Created queue %s!', queue)
  }


  validateRoutingKey(routingKey)
  if (/^\d+$/.test(routingKey) && !routes.get(routingKey)) {
    await amqpPublish(UNOAPI_EXCHANGE_BRIDGE_NAME, `${UNOAPI_QUEUE_BIND}.${UNOAPI_SERVER_NAME}`, '', { routingKey }, { type: 'direct' })
    routes.set(routingKey, true)
  }
  return queues.get(queue)!
}


const getExchangeType = (exchange): ExchangeType => {
  if (UNOAPI_EXCHANGE_BRIDGE_NAME == exchange) {
    return 'direct'
  } else if (UNOAPI_EXCHANGE_BROKER_NAME == exchange) {
    return 'topic'
  } else {
    throw `Unknow exchange ${exchange}`
  }
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
    priority: 0
  },
) => {
  validateRoutingKey(routingKey)
  const channel = await amqpGetChannel()
  options.type = options.type || getExchangeType(exchange)
  logger.debug('Publishing at exchange: %s, with queue: %s, routing key: %s and type: %s', exchange, queue, routingKey, options.type)
  await amqpGetExchange(exchange, options.type!, options.prefetch!)
  const { queueMain, queueDead, queueDelayed } = await amqpGetQueue(exchange, queue, routingKey, options)
  const { delay, dead, maxRetries, countRetries } = options
  const headers: any = {}
  headers[UNOAPI_X_COUNT_RETRIES] = countRetries
  headers[UNOAPI_X_MAX_RETRIES] = maxRetries
  let queueUsed = queueMain
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
    const delayMilliseconds: number = typeof delay == 'number' ? delay : UNOAPI_MESSAGE_RETRY_DELAY
    properties.expiration = delayMilliseconds
    exchangeUsed = queueDelayedName(exchange)
    queueUsed = queueDelayed
  } else if (dead) {
    queueUsed = queueDead
    exchangeUsed = queueDeadName(exchange)
  }
  const destiny = bindingKey(queueUsed.queue, routingKey)
  await channel?.publish(exchangeUsed, destiny, Buffer.from(JSON.stringify(payload)), properties)
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
    notifyFailedMessages: NOTIFY_FAILED_MESSAGES
  },
) => {
  logger.debug('Configurate to consume exchange: %s, queue: %s, routing key: %s and type: %s', exchange, queue, routingKey, options.type)
  validateRoutingKey(routingKey)
  await amqpGetExchange(exchange, options.type!, options.prefetch!)
  const channel = await amqpGetChannel()
  await amqpGetQueue(exchange, queue, routingKey, options)
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
      } else if (IGNORED_TO_NUMBERS.length > 0 && IGNORED_TO_NUMBERS.includes(extractDestinyPhone(data.payload, false))) {
        logger.info(`Ignore messages to ${extractDestinyPhone(data.payload, false)}`)
      } else {
        const timeoutError = `timeout ${CONSUMER_TIMEOUT_MS} is exceeded consume queue: ${queue}, routing key: ${routingKey}, payload: ${content}`
        await withTimeout(CONSUMER_TIMEOUT_MS, timeoutError, callback(routingKey, data, { countRetries, maxRetries }))
      }
      logger.debug('Ack message!')
      await channel?.ack(payload)
    } catch (error) {
      logger.error(error, 'Error on consume %s', queue)
      if (countRetries >= maxRetries) {
        logger.info('Reject %s retries', countRetries)
        if (options.notifyFailedMessages) {
          logger.info('Sending error to whatsapp...')
          await amqpPublish(
            UNOAPI_EXCHANGE_BROKER_NAME,
            UNOAPI_QUEUE_NOTIFICATION,
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
            { maxRetries: 0, type: 'topic' },
          )
          logger.info('Sent error to whatsapp!')
        }
        await amqpPublish(exchange, queue, routingKey, data, { dead: true, type: options.type })
      } else {
        logger.info('Publish retry %s of %s', countRetries, maxRetries)
        await amqpPublish(exchange, queue, routingKey, data, { delay: 60000, maxRetries, countRetries, type: options.type })
      }
      await channel?.ack(payload)
    }
  }

  const bindingKey = await bindQueue(channel, exchange, queue, routingKey)
  const bindingKeyDelayed = await bindQueue(channel, exchange, queue, routingKey, true)

  channel?.on('close', () => {
    channel.unbindQueue(queue, exchange, bindingKey)
    channel.unbindQueue(queue, exchange, bindingKeyDelayed)
  })
  if (!consumers.get(queue)) {
    consumers.set(queue, true)
    channel?.consume(queue, fn)
  }
  logger.info('Waiting for message in queue %s with binding key %s', queue, bindingKey)
}
