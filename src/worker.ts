import * as dotenv from 'dotenv'
dotenv.config()

import { Outgoing } from './services/outgoing'
import { OutgoingJob } from './jobs/outgoing'
import { IncomingJob } from './jobs/incoming'
import { WebhookerJob } from './jobs/webhooker'
import { MediaJob } from './jobs/media'
import { CommanderJob } from './jobs/commander'
import { BulkStatusJob } from './jobs/bulk_status'
import { BulkWebhookJob } from './jobs/bulk_webhook'
import { BulkParserJob } from './jobs/bulk_parser'
import { BulkSenderJob } from './jobs/bulk_sender'
import { BulkReportJob } from './jobs/bulk_report'
import { OutgoingAmqp } from './services/outgoing_amqp'
import { SessionStoreRedis } from './services/session_store_redis'
import { SessionStore } from './services/session_store'
import { OutgoingCloudApi } from './services/outgoing_cloud_api'
import { autoConnect } from './services/auto_connect'
import { IncomingBaileys } from './services/incoming_baileys'
import {
  UNOAPI_JOB_OUTGOING,
  UNOAPI_JOB_INCOMING,
  UNOAPI_JOB_WEBHOOKER,
  UNOAPI_JOB_MEDIA,
  UNOAPI_JOB_BULK_PARSER,
  UNOAPI_JOB_BULK_SENDER,
  UNOAPI_JOB_COMMANDER,
  UNOAPI_JOB_BULK_STATUS,
  UNOAPI_JOB_BULK_REPORT,
  UNOAPI_JOB_BULK_WEBHOOK,
} from './defaults'
import { amqpConsume } from './amqp'
import { startRedis } from './services/redis'
import { IncomingAmqp } from './services/incoming_amqp'
import { getConfig } from './services/config'
import { getConfigRedis } from './services/config_redis'
import { getClientBaileys } from './services/client_baileys'
import { Incoming } from './services/incoming'
import { OnNewLogin } from './services/on_new_login'
import logger from './services/logger'

const outgoingAmqp: Outgoing = new OutgoingAmqp(getConfigRedis)
const incomingAmqp: Incoming = new IncomingAmqp()

const getConfig: getConfig = getConfigRedis

const onNewLogin = new OnNewLogin(outgoingAmqp)

const outgoingCloudApi: Outgoing = new OutgoingCloudApi(getConfig)
const incomingBaileys = new IncomingBaileys(outgoingAmqp, getConfigRedis, getClientBaileys, onNewLogin.run.bind(onNewLogin))
const incomingJob = new IncomingJob(incomingBaileys, outgoingCloudApi, getConfig, UNOAPI_JOB_COMMANDER)

const outgingJob = new OutgoingJob(outgoingCloudApi, getConfigRedis)

const mediaJob = new MediaJob(getConfig)
const webhookerJob = new WebhookerJob(outgoingCloudApi)

const commanderJob = new CommanderJob(outgoingCloudApi, getConfigRedis)
const bulkParserJob = new BulkParserJob(outgoingCloudApi, getConfigRedis)
const bulkSenderJob = new BulkSenderJob(incomingAmqp, outgoingCloudApi)
const bulkStatusJob = new BulkStatusJob()
const bulkReportJob = new BulkReportJob(outgoingCloudApi)
const bulkWebhookJob = new BulkWebhookJob(outgoingCloudApi)

const startWorker = async () => {
  await startRedis()

  logger.debug('Starting Worker')

  logger.debug('Starting outgoing consumer')
  await amqpConsume(UNOAPI_JOB_OUTGOING, outgingJob.consume.bind(outgingJob))

  logger.debug('Starting incoming consumer')
  await amqpConsume(UNOAPI_JOB_INCOMING, incomingJob.consume.bind(incomingJob), { priority: 5 })

  logger.debug('Starting webhooker consumer')
  await amqpConsume(UNOAPI_JOB_WEBHOOKER, webhookerJob.consume.bind(webhookerJob))

  logger.debug('Starting media consumer')
  await amqpConsume(UNOAPI_JOB_MEDIA, mediaJob.consume.bind(mediaJob))

  logger.debug('Starting commander consumer')
  await amqpConsume(UNOAPI_JOB_COMMANDER, commanderJob.consume.bind(commanderJob))

  logger.debug('Starting bulk parser consumer')
  await amqpConsume(UNOAPI_JOB_BULK_PARSER, bulkParserJob.consume.bind(bulkParserJob))

  logger.debug('Starting bulk sender consumer')
  await amqpConsume(UNOAPI_JOB_BULK_SENDER, bulkSenderJob.consume.bind(bulkSenderJob))

  logger.debug('Starting bulk status consumer')
  await amqpConsume(UNOAPI_JOB_BULK_STATUS, bulkStatusJob.consume.bind(bulkStatusJob))

  logger.debug('Starting bulk report consumer')
  await amqpConsume(UNOAPI_JOB_BULK_REPORT, bulkReportJob.consume.bind(bulkReportJob))

  logger.debug('Starting bulk webhook consumer')
  await amqpConsume(UNOAPI_JOB_BULK_WEBHOOK, bulkWebhookJob.consume.bind(bulkWebhookJob))

  logger.debug('Started worker')

  const sessionStore: SessionStore = new SessionStoreRedis()
  await autoConnect(sessionStore, incomingAmqp, outgoingAmqp, getConfigRedis, getClientBaileys, onNewLogin.run.bind(onNewLogin))
}
startWorker()

// // eslint-disable-next-line @typescript-eslint/no-explicit-any
// process.on('unhandledRejection', (reason: any, promise) => {
//   logger.error('unhandledRejection:', reason, reason.stack, promise)
//   throw reason
// })
