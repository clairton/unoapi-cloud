import * as dotenv from 'dotenv'
dotenv.config()

import { BindBridgeJob } from './jobs/bind_bridge'
import { SessionStoreRedis } from './services/session_store_redis'
import { SessionStore } from './services/session_store'
import { autoConnect } from './services/auto_connect'
import { 
  UNOAPI_QUEUE_BIND,
  UNOAPI_QUEUE_RELOAD,
  UNOAPI_QUEUE_LOGOUT,
  UNOAPI_SERVER_NAME,
  UNOAPI_EXCHANGE_BRIDGE_NAME,
} from './defaults'
import { amqpConsume } from './amqp'
import { startRedis } from './services/redis'
import { getConfig } from './services/config'
import { getConfigRedis } from './services/config_redis'
import { getClientBaileys } from './services/client_baileys'
import { onNewLoginGenerateToken } from './services/on_new_login_generate_token'
import logger from './services/logger'
import { Listener } from './services/listener'
import { ListenerAmqp } from './services/listener_amqp'
import { OutgoingAmqp } from './services/outgoing_amqp'
import { Outgoing } from './services/outgoing'
import { version } from '../package.json'
import { ReloadBaileys } from './services/reload_baileys'
import { LogoutBaileys } from './services/logout_baileys'
import { ReloadJob } from './jobs/reload'
import { LogoutJob } from './jobs/logout'

const getConfig: getConfig = getConfigRedis
const outgoingAmqp: Outgoing = new OutgoingAmqp(getConfig)
const listenerAmqp: Listener = new ListenerAmqp()
const onNewLogin = onNewLoginGenerateToken(outgoingAmqp)
const bindJob = new BindBridgeJob()
const reload = new ReloadBaileys(getClientBaileys, getConfig, listenerAmqp, onNewLogin)
const reloadJob = new ReloadJob(reload)
const logout = new LogoutBaileys(getClientBaileys, getConfig, listenerAmqp, onNewLogin)
const logoutJob = new LogoutJob(logout)

const startBrigde = async () => {
  await startRedis()

  logger.info('Unoapi Cloud version %s starting bridge...', version)

  logger.info('Starting bind listener consumer')
  await amqpConsume(
    UNOAPI_EXCHANGE_BRIDGE_NAME, 
    `${UNOAPI_QUEUE_BIND}.${UNOAPI_SERVER_NAME}`, 
    '',
    bindJob.consume.bind(bindJob),
    {
      prefetch: 1,
      type: 'direct'
    }
  )

  logger.info('Starting reload consumer')
  await amqpConsume(
    UNOAPI_EXCHANGE_BRIDGE_NAME, 
    `${UNOAPI_QUEUE_RELOAD}.${UNOAPI_SERVER_NAME}`, 
    '*', 
    reloadJob.consume.bind(reloadJob),
    {
      prefetch: 1,
      type: 'direct'
    }
  )

  logger.info('Starting logout consumer')
  await amqpConsume(
    UNOAPI_EXCHANGE_BRIDGE_NAME,
    `${UNOAPI_QUEUE_LOGOUT}.${UNOAPI_SERVER_NAME}`,
    '*', 
    logoutJob.consume.bind(logoutJob),
    {
      prefetch: 1,
      type: 'direct'
    }
  )

  const sessionStore: SessionStore = new SessionStoreRedis()

  logger.info('Unoapi Cloud version %s started brige!', version)

  await autoConnect(sessionStore, listenerAmqp, getConfigRedis, getClientBaileys, onNewLogin)
}
startBrigde()

process.on('unhandledRejection', (reason: any, promise) => {
  logger.error('unhandledRejection bridge: %s %s %s', reason, reason.stack, promise)
  throw reason
})
