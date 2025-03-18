import { Outgoing } from './services/outgoing'
import { CommanderJob } from './jobs/commander'
import { BulkStatusJob } from './jobs/bulk_status'
import { BulkWebhookJob } from './jobs/bulk_webhook'
import { BulkParserJob } from './jobs/bulk_parser'
import { BulkSenderJob } from './jobs/bulk_sender'
import { BulkReportJob } from './jobs/bulk_report'
import { OutgoingCloudApi } from './services/outgoing_cloud_api'
import {
  UNOAPI_JOB_BULK_PARSER,
  UNOAPI_JOB_BULK_SENDER,
  UNOAPI_JOB_COMMANDER,
  UNOAPI_JOB_BULK_STATUS,
  UNOAPI_JOB_BULK_REPORT,
  UNOAPI_JOB_BULK_WEBHOOK,
} from './defaults'
import { amqpConsume } from './amqp'
import { IncomingAmqp } from './services/incoming_amqp'
import { getConfig } from './services/config'
import { getConfigRedis } from './services/config_redis'
import { Incoming } from './services/incoming'
import logger from './services/logger'
import { isInBlacklistInRedis } from './services/blacklist'
import { version } from '../package.json'

const incomingAmqp: Incoming = new IncomingAmqp()

const getConfig: getConfig = getConfigRedis

const outgoingCloudApi: Outgoing = new OutgoingCloudApi(getConfig, isInBlacklistInRedis)
const commanderJob = new CommanderJob(outgoingCloudApi, getConfigRedis)
const bulkParserJob = new BulkParserJob(outgoingCloudApi, getConfigRedis)
const bulkSenderJob = new BulkSenderJob(incomingAmqp, outgoingCloudApi)
const bulkStatusJob = new BulkStatusJob()
const bulkReportJob = new BulkReportJob(outgoingCloudApi, getConfigRedis)
const bulkWebhookJob = new BulkWebhookJob(outgoingCloudApi)

const startBulker = async () => {
  logger.info('Unoapi Cloud version %s starting bulker...', version)

  logger.info('Starting commander consumer %s', '')
  await amqpConsume(UNOAPI_JOB_COMMANDER, '', commanderJob.consume.bind(commanderJob), { type: 'direct' })

  logger.info('Starting bulk parser consumer %s', '')
  await amqpConsume(UNOAPI_JOB_BULK_PARSER, '', bulkParserJob.consume.bind(bulkParserJob), { type: 'direct' })

  logger.info('Starting bulk sender consumer %s', '')
  await amqpConsume(UNOAPI_JOB_BULK_SENDER, '', bulkSenderJob.consume.bind(bulkSenderJob), { type: 'direct' })

  logger.info('Starting bulk status consumer %s', '')
  await amqpConsume(UNOAPI_JOB_BULK_STATUS, '', bulkStatusJob.consume.bind(bulkStatusJob), { type: 'direct' })

  logger.info('Starting bulk report consumer %s', '')
  await amqpConsume(UNOAPI_JOB_BULK_REPORT, '', bulkReportJob.consume.bind(bulkReportJob), { type: 'direct' })

  logger.info('Starting bulk webhook consumer %s', '')
  await amqpConsume(UNOAPI_JOB_BULK_WEBHOOK, '', bulkWebhookJob.consume.bind(bulkWebhookJob), { type: 'direct' })
}
startBulker()

process.on('unhandledRejection', (reason: any, promise) => {
  logger.error('unhandledRejection bulker: %s %s %s', reason, reason.stack, promise)
  throw reason
})
