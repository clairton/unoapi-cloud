import * as dotenv from 'dotenv'
dotenv.config()

import { 
  UNOAPI_QUEUE_RELOAD,
  UNOAPI_SERVER_NAME,
  UNOAPI_QUEUE_MEDIA,
  UNOAPI_QUEUE_OUTGOING,
  UNOAPI_QUEUE_NOTIFICATION,
  UNOAPI_QUEUE_OUTGOING_PREFETCH,
  UNOAPI_QUEUE_BLACKLIST_ADD,
  NOTIFY_FAILED_MESSAGES,
  UNOAPI_EXCHANGE_BROKER_NAME,
} from './defaults'

import { amqpConsume } from './amqp'
import { startRedis } from './services/redis'
import { OutgoingCloudApi } from './services/outgoing_cloud_api'
import { getConfigRedis } from './services/config_redis'
import logger from './services/logger'
import { version } from '../package.json'
import { ReloadJob } from './jobs/reload'
import { MediaJob } from './jobs/media'
import { Reload } from './services/reload'
import { OutgoingJob } from './jobs/outgoing'
import { IncomingAmqp } from './services/incoming_amqp'
import { Incoming } from './services/incoming'
import { Outgoing } from './services/outgoing'
import { isInBlacklistInRedis } from './services/blacklist'
import { NotificationJob } from './jobs/notification'
import { addToBlacklist } from './jobs/add_to_blacklist'

const incomingAmqp: Incoming = new IncomingAmqp(getConfigRedis)
const outgoingCloudApi: Outgoing = new OutgoingCloudApi(getConfigRedis, isInBlacklistInRedis)
const reload = new Reload()
const reloadJob = new ReloadJob(reload)
const mediaJob = new MediaJob(getConfigRedis)
const notificationJob = new NotificationJob(incomingAmqp)
const outgingJob = new OutgoingJob(getConfigRedis, outgoingCloudApi)

const startBroker = async () => {
  await startRedis()

  const prefetch = UNOAPI_QUEUE_OUTGOING_PREFETCH

  logger.info('Unoapi Cloud version %s starting broker...', version)

  logger.info('Starting reload consumer')
  await amqpConsume(
    UNOAPI_EXCHANGE_BROKER_NAME,
    UNOAPI_QUEUE_RELOAD,
    '*',
    reloadJob.consume.bind(reloadJob),
    { type: 'topic' }
  )

  logger.info('Starting media consumer')
  await amqpConsume(
    UNOAPI_EXCHANGE_BROKER_NAME,
    UNOAPI_QUEUE_MEDIA,
    '*',
    mediaJob.consume.bind(mediaJob),
    { type: 'topic' }
  )

  logger.info('Binding queues consumer for server %s', UNOAPI_SERVER_NAME)

  const notifyFailedMessages = NOTIFY_FAILED_MESSAGES

  logger.info('Starting outgoing consumer %s', UNOAPI_SERVER_NAME)
  await amqpConsume(
    UNOAPI_EXCHANGE_BROKER_NAME,
    UNOAPI_QUEUE_OUTGOING,
    '*',
    outgingJob.consume.bind(outgingJob),
    { notifyFailedMessages, prefetch, type: 'topic' }
  )

  if (notifyFailedMessages) {
    logger.debug('Starting notification consumer %s', UNOAPI_SERVER_NAME)
    await amqpConsume(
      UNOAPI_EXCHANGE_BROKER_NAME,
      UNOAPI_QUEUE_NOTIFICATION,
      '*',
      notificationJob.consume.bind(notificationJob),
      { notifyFailedMessages: false, type: 'topic' }
    )
  }

  logger.info('Starting blacklist add consumer %s', UNOAPI_SERVER_NAME)
  await amqpConsume(
    UNOAPI_EXCHANGE_BROKER_NAME,
    UNOAPI_QUEUE_BLACKLIST_ADD,
    '*',
    addToBlacklist,
    { notifyFailedMessages, prefetch, type: 'topic' }
  )

  logger.info('Unoapi Cloud version %s started broker!', version)
}
startBroker()

process.on('unhandledRejection', (reason: any, promise) => {
  logger.error('unhandledRejection broker: %s %s %s', reason, reason.stack, promise)
  throw reason
})
