import { IncomingJob } from './incoming'
import { ListenerJob } from './listener'
import { Broadcast } from '../services/broadcast'
import {
  UNOAPI_JOB_INCOMING,
  UNOAPI_JOB_COMMANDER,
  UNOAPI_JOB_LISTENER,
  UNOAPI_JOB_OUTGOING_PREFETCH,
  UNOAPI_SERVER_NAME,
} from '../defaults'
import { amqpConsume } from '../amqp'
import { getConfig } from '../services/config'
import { getConfigRedis } from '../services/config_redis'
import { getClientBaileys } from '../services/client_baileys'
import { onNewLoginGenerateToken } from '../services/on_new_login_generate_token'
import { Outgoing } from '../services/outgoing'
import logger from '../services/logger'
import { Listener } from '../services/listener'
import { ListenerBaileys } from '../services/listener_baileys'
import { OutgoingAmqp } from '../services/outgoing_amqp'
import { BroadcastAmqp } from '../services/broadcast_amqp'
import { isInBlacklistInRedis } from '../services/blacklist'
import { ListenerAmqp } from '../services/listener_amqp'
import { OutgoingCloudApi } from '../services/outgoing_cloud_api'
import { IncomingBaileys } from '../services/incoming_baileys'

const outgoingAmqp: Outgoing = new OutgoingAmqp(getConfigRedis)
const listenerAmqp: Listener = new ListenerAmqp()
const broadcastAmqp: Broadcast = new BroadcastAmqp()
const listenerBaileys: Listener = new ListenerBaileys(outgoingAmqp, broadcastAmqp, getConfigRedis)

const getConfig: getConfig = getConfigRedis

const outgoingCloudApi: Outgoing = new OutgoingCloudApi(getConfig, isInBlacklistInRedis)
const onNewLogin = onNewLoginGenerateToken(outgoingCloudApi)
const incomingBaileys = new IncomingBaileys(listenerAmqp, getConfigRedis, getClientBaileys, onNewLogin)
const incomingJob = new IncomingJob(incomingBaileys, outgoingAmqp, getConfig, UNOAPI_JOB_COMMANDER)
const listenerJob = new ListenerJob(listenerBaileys, outgoingCloudApi)

const processeds = new Map<string, boolean>()

export class BindBridgeJob {
  async consume(server: string, { routingKey }: { routingKey: string }) {
    const config = await getConfig(routingKey)
    if (config.provider !== 'baileys') {
      logger.info(`Ignore bing brigde routing key ${routingKey} is not provider baileys...`)
      return;
    }
    if (config.server !== UNOAPI_SERVER_NAME) {
      logger.info(`Ignore bing brigde ${routingKey} server ${config.server} is not server current server ${UNOAPI_SERVER_NAME}...`)
      return;
    }
    const store = await config.getStore(routingKey, config)
    const { sessionStore } = store
    if (!(await sessionStore.isStatusOnline(routingKey)) && processeds.get(routingKey)) {
      return
    }
    processeds.set(routingKey, true)
    const prefetch = UNOAPI_JOB_OUTGOING_PREFETCH
    logger.info('Binding queues consumer bridge server %s routingKey %s', server, routingKey)

    const notifyFailedMessages = config.notifyFailedMessages

    logger.info('Starting listener consumer %s', routingKey)
    await amqpConsume(UNOAPI_JOB_LISTENER, routingKey, listenerJob.consume.bind(listenerJob), {
      notifyFailedMessages,
      prefetch,
      priority: 5,
    })

    logger.info('Starting incoming consumer %s', routingKey)
    await amqpConsume(UNOAPI_JOB_INCOMING, routingKey, incomingJob.consume.bind(incomingJob), {
      priority: 5,
      notifyFailedMessages,
      prefetch: 1 /* allways 1 */,
    })
  }
}
