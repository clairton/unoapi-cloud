import * as dotenv from 'dotenv'
dotenv.config()

import { BindBridgeJob } from './jobs/bind_bridge'
import { SessionStoreRedis } from './services/session_store_redis'
import { SessionStore } from './services/session_store'
import { autoConnect } from './services/auto_connect'
import { 
  UNOAPI_JOB_BIND,
  UNOAPI_JOB_BIND_BRIDGE
} from './defaults'
import { amqpConsume } from './amqp'
import { startRedis } from './services/redis'
import { IncomingAmqp } from './services/incoming_amqp'
import { getConfig } from './services/config'
import { getConfigRedis } from './services/config_redis'
import { getClientBaileys } from './services/client_baileys'
import { Incoming } from './services/incoming'
import { onNewLoginGenerateToken } from './services/on_new_login_generate_token'
import logger from './services/logger'
import { Listener } from './services/listener'
import { ListenerAmqp } from './services/listener_amqp'
import { OutgoingAmqp } from './services/outgoing_amqp'
import { Outgoing } from './services/outgoing'
import { version } from '../package.json'

const outgoingAmqp: Outgoing = new OutgoingAmqp(getConfigRedis)
const incomingAmqp: Incoming = new IncomingAmqp()
const listenerAmqp: Listener = new ListenerAmqp()

const getConfig: getConfig = getConfigRedis

const onNewLogin = onNewLoginGenerateToken(outgoingAmqp)
const bindJob = new BindBridgeJob()

const startBrigde = async () => {
  await startRedis()

  logger.info('Unoapi Cloud version %s starting bridge...', version)

  logger.info('Starting bind listener consumer')
  await amqpConsume(UNOAPI_JOB_BIND, UNOAPI_JOB_BIND_BRIDGE, bindJob.consume.bind(bindJob))

  const sessionStore: SessionStore = new SessionStoreRedis()

  logger.info('Unoapi Cloud version %s started brige!', version)

  await autoConnect(sessionStore, incomingAmqp, listenerAmqp, getConfigRedis, getClientBaileys, onNewLogin)
}
startBrigde()

process.on('unhandledRejection', (reason: any, promise) => {
  logger.error('unhandledRejection bridge: %s %s %s', reason, reason.stack, promise)
  throw reason
})
