import { Outgoing } from '../services/outgoing'
import { OutgoingJob } from './outgoing'
import { IncomingJob } from './incoming'
import { WebhookerJob } from '../jobs/webhooker'
import { MediaJob } from '../jobs/media'
import { CommanderJob } from '../jobs/commander'
import { BulkStatusJob } from '../jobs/bulk_status'
import { BulkWebhookJob } from '../jobs/bulk_webhook'
import { BulkParserJob } from '../jobs/bulk_parser'
import { BulkSenderJob } from '../jobs/bulk_sender'
import { BulkReportJob } from '../jobs/bulk_report'
import { OutgoingAmqp } from '../services/outgoing_amqp'
import { OutgoingCloudApi } from '../services/outgoing_cloud_api'
import { IncomingBaileys } from '../services/incoming_baileys'
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
} from '../defaults'
import { amqpConsume } from '../amqp'
import { IncomingAmqp } from '../services/incoming_amqp'
import { getConfig } from '../services/config'
import { getConfigRedis } from '../services/config_redis'
import { getClientBaileys } from '../services/client_baileys'
import { Incoming } from '../services/incoming'
import { OnNewLogin } from '../services/on_new_login'
import logger from '../services/logger'

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

export class BindJob {
  async consume({ phone }: { phone: string }) {
    const config = await getConfig(phone)
    const notifyFailedMessages = config.notifyFailedMessages

    logger.debug('Starting outgoing consumer %s', phone)
    await amqpConsume(UNOAPI_JOB_OUTGOING, phone, outgingJob.consume.bind(outgingJob), { notifyFailedMessages })

    logger.debug('Starting incoming consumer %s', phone)
    await amqpConsume(UNOAPI_JOB_INCOMING, phone, incomingJob.consume.bind(incomingJob), { priority: 5, notifyFailedMessages })

    logger.debug('Starting webhooker consumer %s', phone)
    await amqpConsume(UNOAPI_JOB_WEBHOOKER, phone, webhookerJob.consume.bind(webhookerJob), { notifyFailedMessages })

    logger.debug('Starting media consumer %s', phone)
    await amqpConsume(UNOAPI_JOB_MEDIA, phone, mediaJob.consume.bind(mediaJob), { notifyFailedMessages })

    logger.debug('Starting commander consumer %s', phone)
    await amqpConsume(UNOAPI_JOB_COMMANDER, phone, commanderJob.consume.bind(commanderJob), { notifyFailedMessages })

    logger.debug('Starting bulk parser consumer %s', phone)
    await amqpConsume(UNOAPI_JOB_BULK_PARSER, phone, bulkParserJob.consume.bind(bulkParserJob), { notifyFailedMessages })

    logger.debug('Starting bulk sender consumer %s', phone)
    await amqpConsume(UNOAPI_JOB_BULK_SENDER, phone, bulkSenderJob.consume.bind(bulkSenderJob), { notifyFailedMessages })

    logger.debug('Starting bulk status consumer %s', phone)
    await amqpConsume(UNOAPI_JOB_BULK_STATUS, phone, bulkStatusJob.consume.bind(bulkStatusJob), { notifyFailedMessages })

    logger.debug('Starting bulk report consumer %s', phone)
    await amqpConsume(UNOAPI_JOB_BULK_REPORT, phone, bulkReportJob.consume.bind(bulkReportJob), { notifyFailedMessages })

    logger.debug('Starting bulk webhook consumer %s', phone)
    await amqpConsume(UNOAPI_JOB_BULK_WEBHOOK, phone, bulkWebhookJob.consume.bind(bulkWebhookJob), { notifyFailedMessages })
  }
}
