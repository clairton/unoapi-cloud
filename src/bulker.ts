import { Outgoing } from './services/outgoing'
import { CommanderJob } from './jobs/commander'
import { BulkStatusJob } from './jobs/bulk_status'
import { BulkWebhookJob } from './jobs/bulk_webhook'
import { BulkParserJob } from './jobs/bulk_parser'
import { BulkSenderJob } from './jobs/bulk_sender'
import { BulkReportJob } from './jobs/bulk_report'
import { OutgoingCloudApi } from './services/outgoing_cloud_api'
import {
  UNOAPI_QUEUE_BULK_PARSER,
  UNOAPI_QUEUE_BULK_SENDER,
  UNOAPI_QUEUE_COMMANDER,
  UNOAPI_QUEUE_BULK_STATUS,
  UNOAPI_QUEUE_BULK_REPORT,
  UNOAPI_QUEUE_BULK_WEBHOOK,
  UNOAPI_EXCHANGE_BROKER_NAME,
} from './defaults'
import { amqpConsume } from './amqp'
import { IncomingAmqp } from './services/incoming_amqp'
import { getConfig } from './services/config'
import { getConfigRedis } from './services/config_redis'
import { Incoming } from './services/incoming'
import logger from './services/logger'
import { isInBlacklistInRedis } from './services/blacklist'
import { version } from '../package.json'

import * as Sentry from '@sentry/node'
if (process.env.SENTRY_DSN) {
  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    sendDefaultPii: true,
  })
}

const getConfig: getConfig = getConfigRedis
const incomingAmqp: Incoming = new IncomingAmqp(getConfig)


const outgoingCloudApi: Outgoing = new OutgoingCloudApi(getConfig, isInBlacklistInRedis)
const commanderJob = new CommanderJob(outgoingCloudApi, getConfigRedis)
const bulkParserJob = new BulkParserJob(outgoingCloudApi, getConfigRedis)
const bulkSenderJob = new BulkSenderJob(incomingAmqp, outgoingCloudApi)
const bulkStatusJob = new BulkStatusJob()
const bulkReportJob = new BulkReportJob(outgoingCloudApi, getConfigRedis)
const bulkWebhookJob = new BulkWebhookJob(outgoingCloudApi)

const startBulker = async () => {
  logger.info('Unoapi Cloud version %s starting bulker...', version)

  logger.info('Starting commander consumer')
  await amqpConsume(UNOAPI_EXCHANGE_BROKER_NAME, UNOAPI_QUEUE_COMMANDER, '*', commanderJob.consume.bind(commanderJob), { type: 'topic' })

  logger.info('Starting bulk parser consumer')
  await amqpConsume(UNOAPI_EXCHANGE_BROKER_NAME, UNOAPI_QUEUE_BULK_PARSER, '*', bulkParserJob.consume.bind(bulkParserJob), { type: 'topic' })

  logger.info('Starting bulk sender consumer')
  await amqpConsume(UNOAPI_EXCHANGE_BROKER_NAME, UNOAPI_QUEUE_BULK_SENDER, '*', bulkSenderJob.consume.bind(bulkSenderJob), { type: 'topic' })

  logger.info('Starting bulk status consumer')
  await amqpConsume(UNOAPI_EXCHANGE_BROKER_NAME, UNOAPI_QUEUE_BULK_STATUS, '*', bulkStatusJob.consume.bind(bulkStatusJob), { type: 'topic' })

  logger.info('Starting bulk report consumer')
  await amqpConsume(UNOAPI_EXCHANGE_BROKER_NAME, UNOAPI_QUEUE_BULK_REPORT, '*', bulkReportJob.consume.bind(bulkReportJob), { type: 'topic' })

  logger.info('Starting bulk webhook consumer')
  await amqpConsume(UNOAPI_EXCHANGE_BROKER_NAME, UNOAPI_QUEUE_BULK_WEBHOOK, '*', bulkWebhookJob.consume.bind(bulkWebhookJob), { type: 'topic' })
}
startBulker()

process.on('uncaughtException', (reason: any) => {
  if (process.env.SENTRY_DSN) {
    Sentry.captureException(reason)
  }
  logger.error('uncaughtException bulker: %s %s %s', reason, reason.stack)
  process.exit(1)
})
