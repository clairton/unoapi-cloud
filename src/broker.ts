import * as dotenv from 'dotenv'
dotenv.config()

import { 
  UNOAPI_JOB_RELOAD,
  UNOAPI_SERVER_NAME,
  UNOAPI_JOB_MEDIA,
  UNOAPI_JOB_OUTGOING,
  UNOAPI_JOB_WEBHOOKER,
  UNOAPI_JOB_NOTIFICATION,
  UNOAPI_JOB_OUTGOING_PREFETCH,
  UNOAPI_JOB_BLACKLIST_ADD,
  NOTIFY_FAILED_MESSAGES,
} from './defaults'

import { amqpConsume } from './amqp'
import { getConfig, startRedis } from './services/redis'
import { OutgoingCloudApi } from './services/outgoing_cloud_api'
import { getConfigRedis } from './services/config_redis'
import logger from './services/logger'
import { version } from '../package.json'
import { ReloadJob } from './jobs/reload'
import { MediaJob } from './jobs/media'
import { Reload } from './services/reload'
import { OutgoingJob } from './jobs/outgoing'
import { WebhookerJob } from './jobs/webhooker'
import { IncomingAmqp } from './services/incoming_amqp'
import { Incoming } from './services/incoming'
import { Outgoing } from './services/outgoing'
import { isInBlacklistInRedis } from './services/blacklist'
import { NotificationJob } from './jobs/notification'
import { addToBlacklist } from './jobs/add_to_blacklist'

const incomingAmqp: Incoming = new IncomingAmqp()
const outgoingCloudApi: Outgoing = new OutgoingCloudApi(getConfigRedis, isInBlacklistInRedis)
const reload = new Reload()
const reloadJob = new ReloadJob(reload)
const mediaJob = new MediaJob(getConfig)
const notificationJob = new NotificationJob(incomingAmqp)
const outgingJob = new OutgoingJob(outgoingCloudApi)
const webhookerJob = new WebhookerJob(outgoingCloudApi)

const startBroker = async () => {
  await startRedis()

  logger.info('Unoapi Cloud version %s starting broker...', version)

  logger.info('Starting reload consumer')
  await amqpConsume(UNOAPI_JOB_RELOAD, UNOAPI_SERVER_NAME, reloadJob.consume.bind(reloadJob))

  logger.info('Starting media consumer')
  await amqpConsume(UNOAPI_JOB_MEDIA, '', mediaJob.consume.bind(mediaJob))

  const prefetch = UNOAPI_JOB_OUTGOING_PREFETCH
  logger.info('Binding queues consumer for server %s', UNOAPI_SERVER_NAME)

  const notifyFailedMessages = NOTIFY_FAILED_MESSAGES

  logger.info('Starting outgoing consumer %s', UNOAPI_SERVER_NAME)
  await amqpConsume(UNOAPI_JOB_OUTGOING, '', outgingJob.consume.bind(outgingJob), { notifyFailedMessages, prefetch })

  logger.info('Starting webhooker consumer %s', UNOAPI_SERVER_NAME)
  await amqpConsume(UNOAPI_JOB_WEBHOOKER, '', webhookerJob.consume.bind(webhookerJob), { notifyFailedMessages, prefetch })

  if (notifyFailedMessages) {
    logger.debug('Starting notification consumer %s', UNOAPI_SERVER_NAME)
    await amqpConsume(UNOAPI_JOB_NOTIFICATION, '', notificationJob.consume.bind(notificationJob), { notifyFailedMessages: false })
  }

  logger.info('Starting blacklist add consumer %s', UNOAPI_SERVER_NAME)
  await amqpConsume(UNOAPI_JOB_BLACKLIST_ADD, '', addToBlacklist, { notifyFailedMessages, prefetch })

  logger.info('Unoapi Cloud version %s started broker!', version)
}
startBroker()

process.on('unhandledRejection', (reason: any, promise) => {
  logger.error('unhandledRejection broker: %s %s %s', reason, reason.stack, promise)
  throw reason
})
