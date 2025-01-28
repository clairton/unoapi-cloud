import { IncomingJob } from './incoming'
import { ListenerJob } from './listener'
import { Broadcast } from '../services/broadcast'
import {
  UNOAPI_JOB_INCOMING,
  UNOAPI_JOB_COMMANDER,
  UNOAPI_JOB_LISTENER,
  UNOAPI_JOB_OUTGOING_PREFETCH,
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
import { ReadWhenReceipt } from '../services/read_when_receipt'

const outgoingAmqp: Outgoing = new OutgoingAmqp(getConfigRedis)
const listenerAmqp: Listener = new ListenerAmqp()
const broadcastAmqp: Broadcast = new BroadcastAmqp()
const getConfig: getConfig = getConfigRedis
const readWhenReceipt: ReadWhenReceipt = async (from, messageId) => {
  const payload = {
    messaging_product: 'whatsapp',
    status: 'read',
    message_id: messageId
  }
  await incomingBaileys.send(from, payload, {})
}

const listenerBaileys: Listener = new ListenerBaileys(outgoingAmqp, broadcastAmqp, getConfigRedis, readWhenReceipt)


const outgoingCloudApi: Outgoing = new OutgoingCloudApi(getConfig, isInBlacklistInRedis)
const onNewLogin = onNewLoginGenerateToken(outgoingCloudApi)
const incomingBaileys = new IncomingBaileys(listenerAmqp, getConfigRedis, getClientBaileys, onNewLogin)
const incomingJob = new IncomingJob(incomingBaileys, outgoingAmqp, getConfig, UNOAPI_JOB_COMMANDER)
const listenerJob = new ListenerJob(listenerBaileys, outgoingCloudApi)

const processeds = new Map<string, boolean>()

export class BindBridgeJob {
  async consume(server: string, { phone }: { phone: string }) {
    const config = await getConfig(phone)
    const store = await config.getStore(phone, config)
    const { sessionStore } = store
    if (!(await sessionStore.isStatusOnline(phone)) && processeds.get(phone)) {
      return
    }
    processeds.set(phone, true)
    const prefetch = UNOAPI_JOB_OUTGOING_PREFETCH
    logger.info('Binding queues consumer bridge server %s phone %s', server, phone)

    const notifyFailedMessages = config.notifyFailedMessages

    logger.info('Starting listener consumer %s', phone)
    await amqpConsume(UNOAPI_JOB_LISTENER, phone, listenerJob.consume.bind(listenerJob), {
      notifyFailedMessages,
      prefetch,
      priority: 5,
    })

    logger.info('Starting incoming consumer %s', phone)
    await amqpConsume(UNOAPI_JOB_INCOMING, phone, incomingJob.consume.bind(incomingJob), {
      priority: 5,
      notifyFailedMessages,
      prefetch: 1 /* allways 1 */,
    })
  }
}
