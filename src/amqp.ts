import { connect, Connection, Channel, Options, ConsumeMessage } from 'amqplib'
import {
  AMQP_URL,
  UNOAPI_X_COUNT_RETRIES,
  UNOAPI_X_MAX_RETRIES,
  UNOAPI_MESSAGE_RETRY_LIMIT,
  UNOAPI_MESSAGE_RETRY_DELAY,
  UNOAPI_JOB_BIND_BRIDGE,
  UNOAPI_JOB_BIND_BROKER,
  NOTIFY_FAILED_MESSAGES,
  UNOAPI_JOB_NOTIFICATION,
  IGNORED_CONNECTIONS_NUMBERS,
  VALIDATE_ROUTING_KEY,
  CONSUMER_TIMEOUT_MS,
  UNOAPI_SERVER_NAME,
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

const exchangeDelayedName = (exchange: string) => `${exchange}.delayed`
export const exchangeDeadName = (exchange: string) => `${exchange}.dead`

let amqpConnection: Connection | undefined

const channels = new Map<string, Channel>()
const routes = new Map<string, boolean>()

const validateFormatNumber = (v: string) => {
  if (![UNOAPI_SERVER_NAME].includes(v) && '' != v && !/^\d+$/.test(v)) {
    throw `${v} is not a number`
  }
}
const validateRoutingKey = VALIDATE_ROUTING_KEY ? validateFormatNumber : (_) => _

export type CreateOption = {
  delay: number
  priority: number
  notifyFailedMessages: boolean
  prefetch: number
  type: string
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

export const amqpGetChannel = async (
  exchange: string,
  routingKey: string,
  amqpUrl = AMQP_URL,
  options: Partial<CreateOption> = { delay: UNOAPI_MESSAGE_RETRY_DELAY, priority: 0 },
) => {
  validateRoutingKey(routingKey)
  if (!channels.has(exchange)) {
    const connection = await amqpConnect(amqpUrl)
    const channel = await amqpCreateChannel(connection, exchange, options)
    channels.set(exchange, channel)
    channel.channel.on('error', (err) => {
      logger.error(err, 'Channel Error')
      channels.delete(exchange)
    })
    channel.channel.on('close', (err) => {
      logger.error(err, 'Channel Closed')
      channels.delete(exchange)
    })
  }
  if (/^\d+$/.test(routingKey) && !routes.get(routingKey)) {
    await amqpPublish(UNOAPI_JOB_BIND_BRIDGE, UNOAPI_SERVER_NAME, { routingKey })
    await amqpPublish(UNOAPI_JOB_BIND_BROKER, '', { routingKey })
    routes.set(routingKey, true)
  }
  return channels.get(exchange)
}

export const amqpCreateChannel = async (
  connection: Connection,
  exchange: string,
  options: Partial<CreateOption> = { 
    delay: UNOAPI_MESSAGE_RETRY_DELAY, 
    priority: 0, 
    notifyFailedMessages: NOTIFY_FAILED_MESSAGES,
    type: 'topic'
  },
) => {
  logger.info('Creating channel %s...', exchange)
  const channel: Channel = await connection.createChannel()
  channel.prefetch(options.prefetch || 1)
  const exchangeDead = exchangeDeadName(exchange)
  logger.info('Creating exchange %s...', exchangeDead)
  const deadExchange = await channel.assertExchange(exchangeDead, options.type, { durable: true })
  await channel.assertQueue(exchangeDead, { durable: true })
  const parameters = {}
  if (options.priority) {
    parameters['x-max-priority'] = options.priority
  }
  const exchangeOptions = {
    durable: true,
    arguments: parameters,
  }
  const exchangeMain = await channel.assertExchange(exchange, options.type, exchangeOptions)
  await channel.assertQueue(exchange, exchangeOptions)
  logger.info('Created exchange %s!', exchangeDead)
  const exchangeDelayed = exchangeDelayedName(exchange)
  logger.info('Creating exchange %s...', exchangeDelayed)
  const exchangeDelayedOptions = {
    durable: true,
    arguments: { 'x-dead-letter-exchange': exchange },
  }
  const delayedExchange = await channel.assertExchange(exchangeDelayed, options.type, exchangeDelayedOptions)
  await channel.assertQueue(exchangeDelayed, exchangeDelayedOptions)
  logger.info('Created exchange %s!', exchangeDelayed)
  logger.info('Created channel %s!', exchange)
  return { channel, deadExchange, exchangeMain, delayedExchange }
}

export const amqpPublish = async (
  exchange: string,
  routingKey: string,
  payload: object,
  options: Partial<PublishOption> = { delay: 0, dead: false, maxRetries: UNOAPI_MESSAGE_RETRY_LIMIT, countRetries: 0, priority: 0 },
) => {
  validateRoutingKey(routingKey)
  const channelObject = await amqpGetChannel(exchange, routingKey, AMQP_URL, options)
  if (!channelObject) {
    throw `Not create channel for exchange ${exchange}`
  }
  const { channel } = channelObject
  const { delay, dead, maxRetries, countRetries } = options
  const headers: any = {}
  headers[UNOAPI_X_COUNT_RETRIES] = countRetries
  headers[UNOAPI_X_MAX_RETRIES] = maxRetries
  let exchangeName
  const properties: Options.Publish = {
    persistent: true,
    deliveryMode: 2,
    headers,
  }
  if (options.priority) {
    properties.priority = options.priority
  }
  if (delay) {
    exchangeName = exchangeDelayedName(exchange)
    const delayMilliseconds: number = typeof delay == 'number' ? delay : UNOAPI_MESSAGE_RETRY_DELAY
    properties.expiration = delayMilliseconds
  } else if (dead) {
    exchangeName = exchangeDeadName(exchange)
  } else {
    exchangeName = exchange
  }
  await channel.publish(exchangeName, routingKey, Buffer.from(JSON.stringify(payload)), properties)
  logger.debug('Published at %s with routing key: %s, payload: %s, properties: %s', exchangeName, routingKey, JSON.stringify(payload), JSON.stringify(properties))
}

export const amqpConsume = async (
  exchange: string,
  routingKey: string,
  callback: ConsumeCallback,
  options: Partial<CreateOption> = { delay: UNOAPI_MESSAGE_RETRY_DELAY, priority: 0, notifyFailedMessages: NOTIFY_FAILED_MESSAGES },
) => {
  validateRoutingKey(routingKey)
  const channelObject = await amqpGetChannel(exchange, routingKey, AMQP_URL, options)
  if (!channelObject) {
    throw `Not create channel for exchange ${exchange}`
  }
  const { channel } = channelObject
  const fn = async (payload: ConsumeMessage | null) => {
    if (!payload) {
      throw `payload not be null `
    }
    const content: string = payload.content.toString()
    const routingKey = payload.fields.routingKey
    const data = JSON.parse(content)
    const headers = payload.properties.headers || {}
    const maxRetries = parseInt(headers[UNOAPI_X_MAX_RETRIES] || UNOAPI_MESSAGE_RETRY_LIMIT)
    const countRetries = parseInt(headers[UNOAPI_X_COUNT_RETRIES] || '0') + 1
    try {
      logger.debug('Received in exchange %s%s, message: %s with headers: %s', exchange, routingKey ? `, with routing key: ${routingKey}` : '', content, JSON.stringify(payload.properties.headers))
      if (IGNORED_CONNECTIONS_NUMBERS.includes(routingKey)) {
        logger.info(`Ignore messages from ${routingKey}`)
      } else {
        const timeoutError = `timeout ${CONSUMER_TIMEOUT_MS} is exceeded consume exchange: ${exchange}, routing key: ${routingKey}, payload: ${content}`
        await withTimeout(CONSUMER_TIMEOUT_MS, timeoutError, callback(routingKey, data, { countRetries, maxRetries }))
      }
      logger.debug('Ack message!')
      await channel.ack(payload)
    } catch (error) {
      logger.error(error, 'Error on consume %s', exchange)
      if (countRetries >= maxRetries) {
        logger.info('Reject %s retries', countRetries)
        if (options.notifyFailedMessages) {
          logger.info('Sending error to whatsapp...')
          await amqpPublish(
            UNOAPI_JOB_NOTIFICATION,
            routingKey,
            {
              payload: {
                to: routingKey,
                type: 'text',
                text: {
                  body: `Unoapi version ${version} message failed in exchange ${exchange}\n\nstack trace: ${error.stack}\n\n\nerror: ${error.message
                    }\n\ndata: ${JSON.stringify(data, undefined, 2)}`,
                },
              },
            },
            { maxRetries: 0 },
          )
          logger.info('Sent error to whatsapp!')
        }
        await amqpPublish(exchange, routingKey, data, { dead: true })
      } else {
        logger.info('Publish retry %s of %s', countRetries, maxRetries)
        await amqpPublish(exchange, routingKey, data, { delay: UNOAPI_MESSAGE_RETRY_DELAY * countRetries, maxRetries, countRetries })
      }
      await channel.ack(payload)
    }
  }

  const exchangeDelayed = exchangeDelayedName(exchange)
  const exchangeDelayedParams = [exchangeDelayed,  exchangeDelayed]
  const exchangeParams = [exchange,  exchange]
  if (routingKey) {
    exchangeDelayedParams.push(routingKey)
    exchangeParams.push(routingKey)
  }
  await channel.bindQueue(...exchangeDelayedParams)
  await channel.bindQueue(...exchangeParams)

  channel.on('close', () => {
    channel.unbindQueue(...exchangeDelayedParams)
    channel.unbindQueue(...exchangeParams)
  })

  channel.consume(exchange, fn)
  logger.info('Waiting for message in exchange %s%s', exchange, routingKey ? ` with routing key ${routingKey}` : '')
}
