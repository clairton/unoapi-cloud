import * as dotenv from 'dotenv'
dotenv.config()

import { BindJob } from './jobs/bind'
import { SessionStoreRedis } from './services/session_store_redis'
import { SessionStore } from './services/session_store'
import { autoConnect } from './services/auto_connect'
import { UNOAPI_JOB_BIND, UNOAPI_JOB_RELOAD, UNOAPI_JOB_DISCONNECT } from './defaults'
import { amqpConsume } from './amqp'
import { startRedis } from './services/redis'
import { IncomingAmqp } from './services/incoming_amqp'
import { getConfig } from './services/config'
import { getConfigRedis } from './services/config_redis'
import { getClientBaileys } from './services/client_baileys'
import { Incoming } from './services/incoming'
import { OnNewLogin } from './services/on_new_login'
import logger from './services/logger'
import { ReloadJob } from './jobs/reload'
import { DisconnectJob } from './jobs/disconnect'
import { Listener } from './services/listener'
import { ListenerAmqp } from './services/listener_amqp'
import { OutgoingAmqp } from './services/outgoing_amqp'
import { Outgoing } from './services/outgoing'

const outgoingAmqp: Outgoing = new OutgoingAmqp(getConfigRedis)
const incomingAmqp: Incoming = new IncomingAmqp()
const listenerAmqp: Listener = new ListenerAmqp()

const getConfig: getConfig = getConfigRedis

const onNewLogin = new OnNewLogin(outgoingAmqp)
const bindJob = new BindJob()

const reloadJob = new ReloadJob(getClientBaileys, getConfig, listenerAmqp, incomingAmqp, onNewLogin.run.bind(onNewLogin))
const disconnectJob = new DisconnectJob(getClientBaileys, getConfig, listenerAmqp, incomingAmqp, onNewLogin.run.bind(onNewLogin))

const startWorker = async () => {
  await startRedis()

  logger.debug('Starting Worker')

  const sessionStore: SessionStore = new SessionStoreRedis()

  logger.debug('Starting bind consumer')
  await amqpConsume(UNOAPI_JOB_BIND, '', bindJob.consume.bind(bindJob))

  logger.debug('Starting reload consumer')
  await amqpConsume(UNOAPI_JOB_RELOAD, '', reloadJob.consume.bind(reloadJob))

  logger.debug('Starting disconnect consumer')
  await amqpConsume(UNOAPI_JOB_DISCONNECT, '', disconnectJob.consume.bind(disconnectJob))

  logger.debug('Started worker')

  await autoConnect(sessionStore, incomingAmqp, listenerAmqp, getConfigRedis, getClientBaileys, onNewLogin.run.bind(onNewLogin))
}
startWorker()

// eslint-disable-next-line @typescript-eslint/no-explicit-any
process.on('unhandledRejection', (reason: any, promise) => {
  logger.error('unhandledRejection: %s %s %s', reason, reason.stack, promise)
  throw reason
})
