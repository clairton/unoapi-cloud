import logger from './services/logger'
import { amqpConsume } from './amqp'
import { startRedis } from './services/redis'
import { OutgoingCloudApi } from './services/outgoing_cloud_api'
import { getConfigRedis } from './services/config_redis'
import { version } from '../package.json'
import { ReloadJob } from './jobs/reload'
import { MediaJob } from './jobs/media'
import { Reload } from './services/reload'
import { OutgoingJob } from './jobs/outgoing'
import { IncomingAmqp } from './services/incoming_amqp'
import { Incoming } from './services/incoming'
import { Outgoing } from './services/outgoing'
import { addToBlacklistRedis, isInBlacklistInRedis } from './services/blacklist'
import { NotificationJob } from './jobs/notification'
import { WebhookStatusFailedJob } from './jobs/webhook_status_failed'
import { addToBlacklist } from './jobs/add_to_blacklist'
import { TimerJob } from './jobs/timer'
import { TranscriberJob } from './jobs/transcriber'
import { SpeecherJob } from './jobs/speecher'
import { OutgoingAmqp } from './services/outgoing_amqp'

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
  STATUS_FAILED_WEBHOOK_URL,
  UNOAPI_QUEUE_WEBHOOK_STATUS_FAILED,
  UNOAPI_QUEUE_TIMER,
  UNOAPI_QUEUE_TRANSCRIBER,
  UNOAPI_QUEUE_SPEECH,
} from './defaults'

const incomingAmqp: Incoming = new IncomingAmqp(getConfigRedis)
const outgoingCloudApi: Outgoing = new OutgoingCloudApi(getConfigRedis, isInBlacklistInRedis, addToBlacklistRedis)
const outgoingAmqp: Outgoing = new OutgoingAmqp(getConfigRedis)
const reload = new Reload()
const reloadJob = new ReloadJob(reload)
const mediaJob = new MediaJob(getConfigRedis)
const notificationJob = new NotificationJob(incomingAmqp)
const outgingJob = new OutgoingJob(getConfigRedis, outgoingCloudApi)
const timerJob = new TimerJob(incomingAmqp)
const transcriberJob = new TranscriberJob(outgoingAmqp, getConfigRedis)
const speecherJob = new SpeecherJob(incomingAmqp, getConfigRedis)

import * as Sentry from '@sentry/node'
if (process.env.SENTRY_DSN) {
  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    sendDefaultPii: true,
  })
}

const startBroker = async () => {
  await startRedis()

  const prefetch = UNOAPI_QUEUE_OUTGOING_PREFETCH

  logger.info('Unoapi Cloud version %s starting broker...', version)

  logger.info('Starting reload consumer')
  await amqpConsume(UNOAPI_EXCHANGE_BROKER_NAME, UNOAPI_QUEUE_RELOAD, '*', reloadJob.consume.bind(reloadJob), { type: 'topic' })

  logger.info('Starting media consumer')
  await amqpConsume(UNOAPI_EXCHANGE_BROKER_NAME, UNOAPI_QUEUE_MEDIA, '*', mediaJob.consume.bind(mediaJob), { type: 'topic' })

  logger.info('Binding queues consumer for server %s', UNOAPI_SERVER_NAME)

  const notifyFailedMessages = NOTIFY_FAILED_MESSAGES

  logger.info('Starting outgoing consumer %s', UNOAPI_SERVER_NAME)
  await amqpConsume(UNOAPI_EXCHANGE_BROKER_NAME, UNOAPI_QUEUE_OUTGOING, '*', outgingJob.consume.bind(outgingJob), {
    notifyFailedMessages,
    prefetch,
    type: 'topic',
  })

  logger.info('Starting transcriber consumer %s', UNOAPI_SERVER_NAME)
  await amqpConsume(UNOAPI_EXCHANGE_BROKER_NAME, UNOAPI_QUEUE_TRANSCRIBER, '*', transcriberJob.consume.bind(transcriberJob), {
    notifyFailedMessages,
    prefetch,
    type: 'topic',
  })

  logger.info('Starting speecher consumer %s', UNOAPI_SERVER_NAME)
  await amqpConsume(UNOAPI_EXCHANGE_BROKER_NAME, UNOAPI_QUEUE_SPEECH, '*', speecherJob.consume.bind(speecherJob), {
    notifyFailedMessages,
    prefetch,
    type: 'topic',
  })

  logger.info('Starting timer consumer %s', UNOAPI_SERVER_NAME)
  await amqpConsume(UNOAPI_EXCHANGE_BROKER_NAME, UNOAPI_QUEUE_TIMER, '*', timerJob.consume.bind(timerJob), {
    notifyFailedMessages,
    prefetch,
    type: 'topic',
  })

  if (notifyFailedMessages) {
    logger.debug('Starting notification consumer %s', UNOAPI_SERVER_NAME)
    await amqpConsume(UNOAPI_EXCHANGE_BROKER_NAME, UNOAPI_QUEUE_NOTIFICATION, '*', notificationJob.consume.bind(notificationJob), {
      notifyFailedMessages: false,
      type: 'topic',
    })
  }

  if (STATUS_FAILED_WEBHOOK_URL) {
    const job = new WebhookStatusFailedJob(STATUS_FAILED_WEBHOOK_URL)
    logger.debug('Starting webhook status failed consumer %s', UNOAPI_SERVER_NAME)
    await amqpConsume(UNOAPI_EXCHANGE_BROKER_NAME, UNOAPI_QUEUE_WEBHOOK_STATUS_FAILED, '*', job.consume.bind(job), {
      notifyFailedMessages: false,
      type: 'topic',
    })
  }

  logger.info('Starting blacklist add consumer %s', UNOAPI_SERVER_NAME)
  await amqpConsume(UNOAPI_EXCHANGE_BROKER_NAME, UNOAPI_QUEUE_BLACKLIST_ADD, '*', addToBlacklist, { notifyFailedMessages, prefetch, type: 'topic' })

  logger.info('Unoapi Cloud version %s started broker!', version)
}
startBroker()

process.on('uncaughtException', (reason: any) => {
  if (process.env.SENTRY_DSN) {
    Sentry.captureException(reason)
  }
  logger.error('uncaughtException broker: %s %s', reason, reason.stack)
  process.exit(1)
})

process.on('unhandledRejection', (reason: any, promise) => {
  if (process.env.SENTRY_DSN) {
    Sentry.captureException(reason)
  }
  logger.error('unhandledRejection: %s', reason.stack)
  logger.error('promise: %s', promise)
  process.exit(1)
})
