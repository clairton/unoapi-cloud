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
import { ListenerJob } from '../jobs/listener'
import { BulkReportJob } from '../jobs/bulk_report'
import { ListenerAmqp } from '../services/listener_amqp'
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
  UNOAPI_JOB_LISTENER,
  UNOAPI_JOB_NOTIFICATION,
  UNOAPI_JOB_OUTGOING_PREFETCH,
  DATA_TTL,
} from '../defaults'
import { amqpConsume } from '../amqp'
import { IncomingAmqp } from '../services/incoming_amqp'
import { getConfig } from '../services/config'
import { getConfigRedis } from '../services/config_redis'
import { getClientBaileys } from '../services/client_baileys'
import { Incoming } from '../services/incoming'
import { onNewLoginGenerateToken } from '../services/on_new_login_generate_token'
import logger from '../services/logger'
import { Listener } from '../services/listener'
import { ListenerBaileys } from '../services/listener_baileys'
import { OutgoingAmqp } from '../services/outgoing_amqp'
import { NotificationJob } from '../jobs/notification'
import { isSessionStatusOnline } from '../services/session_store'

const outgoingAmqp: Outgoing = new OutgoingAmqp(getConfigRedis)
const incomingAmqp: Incoming = new IncomingAmqp()
const listenerAmqp: Listener = new ListenerAmqp()

const listenerBaileys: Listener = new ListenerBaileys(outgoingAmqp, getConfigRedis)

const getConfig: getConfig = getConfigRedis

const outgoingCloudApi: Outgoing = new OutgoingCloudApi(getConfig)
const onNewLogin = onNewLoginGenerateToken(outgoingCloudApi)
const incomingBaileys = new IncomingBaileys(listenerAmqp, getConfigRedis, getClientBaileys, onNewLogin)
const incomingJob = new IncomingJob(incomingBaileys, outgoingAmqp, getConfig, UNOAPI_JOB_COMMANDER)
const notificationJob = new NotificationJob(incomingBaileys)

const outgingJob = new OutgoingJob(outgoingCloudApi)
const listenerJob = new ListenerJob(listenerBaileys)

const mediaJob = new MediaJob(getConfig)
const webhookerJob = new WebhookerJob(outgoingCloudApi)

const commanderJob = new CommanderJob(outgoingCloudApi, getConfigRedis)
const bulkParserJob = new BulkParserJob(outgoingCloudApi, getConfigRedis)
const bulkSenderJob = new BulkSenderJob(incomingAmqp, outgoingCloudApi)
const bulkStatusJob = new BulkStatusJob()
const bulkReportJob = new BulkReportJob(outgoingCloudApi, getConfigRedis)
const bulkWebhookJob = new BulkWebhookJob(outgoingCloudApi)

const processeds = new Map<string, boolean>()

export class BindJob {
  async consume(_: string, { phone }: { phone: string }) {
    if (!(await isSessionStatusOnline(phone)) && processeds.get(phone)) {
      return
    }
    processeds.set(phone, true)
    const prefetch = UNOAPI_JOB_OUTGOING_PREFETCH
    logger.info('Binding queues consumer for %s', phone)

    const config = await getConfig(phone)
    const notifyFailedMessages = config.notifyFailedMessages

    logger.debug('Starting outgoing consumer %s', phone)
    await amqpConsume(UNOAPI_JOB_OUTGOING, phone, outgingJob.consume.bind(outgingJob), { notifyFailedMessages, prefetch })

    logger.debug('Starting listener consumer %s', phone)
    await amqpConsume(UNOAPI_JOB_LISTENER, phone, listenerJob.consume.bind(listenerJob), { notifyFailedMessages, prefetch })

    logger.debug('Starting webhooker consumer %s', phone)
    await amqpConsume(UNOAPI_JOB_WEBHOOKER, phone, webhookerJob.consume.bind(webhookerJob), { notifyFailedMessages, prefetch })

    logger.debug('Starting incoming consumer %s', phone)
    await amqpConsume(UNOAPI_JOB_INCOMING, phone, incomingJob.consume.bind(incomingJob), {
      priority: 5,
      notifyFailedMessages,
      prefetch: 1 /* allways 1 */,
    })

    if (config.notifyFailedMessages) {
      logger.debug('Starting notification consumer %s', phone)
      await amqpConsume(UNOAPI_JOB_NOTIFICATION, phone, notificationJob.consume.bind(notificationJob), { notifyFailedMessages: false })
    }

    if (DATA_TTL > 0) {
      logger.debug('Starting media consumer %s', phone)
      await amqpConsume(UNOAPI_JOB_MEDIA, phone, mediaJob.consume.bind(mediaJob), { notifyFailedMessages })
    }

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
