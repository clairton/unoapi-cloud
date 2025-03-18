import { Outgoing } from '../services/outgoing'
import { OutgoingJob } from './outgoing'
import { WebhookerJob } from '../jobs/webhooker'
import { addToBlacklist } from '../jobs/add_to_blacklist'
import { OutgoingCloudApi } from '../services/outgoing_cloud_api'
import {
  UNOAPI_JOB_OUTGOING,
  UNOAPI_JOB_WEBHOOKER,
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
const webhookerJob = new WebhookerJob(outgoingCloudApi)
const processeds = new Map<string, boolean>()

export class BindBrokerJob {
  async consume(server: string, { routingKey }: { routingKey: string }) { 
    const config = await getConfig(routingKey)
    const store = await config.getStore(routingKey, config)
    const { sessionStore } = store
    if (!(await sessionStore.isStatusOnline(routingKey)) && processeds.get(routingKey)) {
      return
    }
    processeds.set(routingKey, true)
    const prefetch = UNOAPI_JOB_OUTGOING_PREFETCH
    logger.info('Binding queues consumer for server %s routing key %s', server, routingKey)

    const notifyFailedMessages = config.notifyFailedMessages

    logger.info('Starting outgoing consumer %s', routingKey)
    await amqpConsume(UNOAPI_JOB_OUTGOING, routingKey, outgingJob.consume.bind(outgingJob), { notifyFailedMessages, prefetch })

    logger.info('Starting webhooker consumer %s', routingKey)
    await amqpConsume(UNOAPI_JOB_WEBHOOKER, routingKey, webhookerJob.consume.bind(webhookerJob), { notifyFailedMessages, prefetch })

    if (config.notifyFailedMessages) {
      logger.debug('Starting notification consumer %s', routingKey)
      await amqpConsume(UNOAPI_JOB_NOTIFICATION, routingKey, notificationJob.consume.bind(notificationJob), { notifyFailedMessages: false })
    }

    logger.info('Starting blacklist add consumer')
    await amqpConsume(UNOAPI_JOB_BLACKLIST_ADD, routingKey, addToBlacklist)
  }
}
