import { Outgoing } from '../services/outgoing'
import { OutgoingJob } from './outgoing'
import { WebhookerJob } from '../jobs/webhooker'
import { MediaJob } from '../jobs/media'
import { CommanderJob } from '../jobs/commander'
import { BulkStatusJob } from '../jobs/bulk_status'
import { BulkWebhookJob } from '../jobs/bulk_webhook'
import { BulkParserJob } from '../jobs/bulk_parser'
import { BulkSenderJob } from '../jobs/bulk_sender'
import { BulkReportJob } from '../jobs/bulk_report'
import { addToBlacklist } from '../jobs/add_to_blacklist'
import { OutgoingCloudApi } from '../services/outgoing_cloud_api'
import {
  UNOAPI_JOB_OUTGOING,
  UNOAPI_JOB_WEBHOOKER,
  UNOAPI_JOB_MEDIA,
  UNOAPI_JOB_BULK_PARSER,
  UNOAPI_JOB_BULK_SENDER,
  UNOAPI_JOB_COMMANDER,
  UNOAPI_JOB_BULK_STATUS,
  UNOAPI_JOB_BULK_REPORT,
  UNOAPI_JOB_BULK_WEBHOOK,
  UNOAPI_JOB_NOTIFICATION,
  UNOAPI_JOB_OUTGOING_PREFETCH,
  UNOAPI_JOB_BLACKLIST_ADD,
} from '../defaults'
import { amqpConsume } from '../amqp'
import { IncomingAmqp } from '../services/incoming_amqp'
import { getConfig } from '../services/config'
import { getConfigRedis } from '../services/config_redis'
import { Incoming } from '../services/incoming'
import logger from '../services/logger'
import { NotificationJob } from '../jobs/notification'
import { isInBlacklistInRedis } from '../services/blacklist'

const incomingAmqp: Incoming = new IncomingAmqp()

const getConfig: getConfig = getConfigRedis

const outgoingCloudApi: Outgoing = new OutgoingCloudApi(getConfig, isInBlacklistInRedis)
const notificationJob = new NotificationJob(incomingAmqp)

const outgingJob = new OutgoingJob(outgoingCloudApi)

const mediaJob = new MediaJob(getConfig)
const webhookerJob = new WebhookerJob(outgoingCloudApi)

const commanderJob = new CommanderJob(outgoingCloudApi, getConfigRedis)
const bulkParserJob = new BulkParserJob(outgoingCloudApi, getConfigRedis)
const bulkSenderJob = new BulkSenderJob(incomingAmqp, outgoingCloudApi)
const bulkStatusJob = new BulkStatusJob()
const bulkReportJob = new BulkReportJob(outgoingCloudApi, getConfigRedis)
const bulkWebhookJob = new BulkWebhookJob(outgoingCloudApi)
const processeds = new Map<string, boolean>()

export class BindBrokerJob {
  async consume(server: string, { phone }: { phone: string }) { 
    const config = await getConfig(phone)
    const store = await config.getStore(phone, config)
    const { sessionStore } = store
    if (!(await sessionStore.isStatusOnline(phone)) && processeds.get(phone)) {
      return
    }
    processeds.set(phone, true)
    const prefetch = UNOAPI_JOB_OUTGOING_PREFETCH
    logger.info('Binding queues consumer for server %s phone %s', server, phone)

    const notifyFailedMessages = config.notifyFailedMessages

    logger.info('Starting outgoing consumer %s', phone)
    await amqpConsume(UNOAPI_JOB_OUTGOING, phone, outgingJob.consume.bind(outgingJob), { notifyFailedMessages, prefetch })

    logger.info('Starting webhooker consumer %s', phone)
    await amqpConsume(UNOAPI_JOB_WEBHOOKER, phone, webhookerJob.consume.bind(webhookerJob), { notifyFailedMessages, prefetch })

    if (config.notifyFailedMessages) {
      logger.debug('Starting notification consumer %s', phone)
      await amqpConsume(UNOAPI_JOB_NOTIFICATION, phone, notificationJob.consume.bind(notificationJob), { notifyFailedMessages: false })
    }

    logger.info('Starting media consumer %s', phone)
    await amqpConsume(UNOAPI_JOB_MEDIA, phone, mediaJob.consume.bind(mediaJob), { notifyFailedMessages })

    logger.info('Starting commander consumer %s', phone)
    await amqpConsume(UNOAPI_JOB_COMMANDER, phone, commanderJob.consume.bind(commanderJob), { notifyFailedMessages })

    logger.info('Starting bulk parser consumer %s', phone)
    await amqpConsume(UNOAPI_JOB_BULK_PARSER, phone, bulkParserJob.consume.bind(bulkParserJob), { notifyFailedMessages })

    logger.info('Starting bulk sender consumer %s', phone)
    await amqpConsume(UNOAPI_JOB_BULK_SENDER, phone, bulkSenderJob.consume.bind(bulkSenderJob), { notifyFailedMessages })

    logger.info('Starting bulk status consumer %s', phone)
    await amqpConsume(UNOAPI_JOB_BULK_STATUS, phone, bulkStatusJob.consume.bind(bulkStatusJob), { notifyFailedMessages })

    logger.info('Starting bulk report consumer %s', phone)
    await amqpConsume(UNOAPI_JOB_BULK_REPORT, phone, bulkReportJob.consume.bind(bulkReportJob), { notifyFailedMessages })

    logger.info('Starting bulk webhook consumer %s', phone)
    await amqpConsume(UNOAPI_JOB_BULK_WEBHOOK, phone, bulkWebhookJob.consume.bind(bulkWebhookJob), { notifyFailedMessages })

    logger.info('Starting blacklist add consumer')
    await amqpConsume(UNOAPI_JOB_BLACKLIST_ADD, phone, addToBlacklist)
  }
}
