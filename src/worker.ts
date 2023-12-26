import * as dotenv from 'dotenv'
dotenv.config()

import { Outgoing } from './services/outgoing'
import { BindJob } from './jobs/bind'
import { OutgoingAmqp } from './services/outgoing_amqp'
import { SessionStoreRedis } from './services/session_store_redis'
import { SessionStore } from './services/session_store'

import { autoConnect } from './services/auto_connect'
import { UNOAPI_JOB_BIND } from './defaults'
import { amqpConsume } from './amqp'
import { startRedis } from './services/redis'
import { IncomingAmqp } from './services/incoming_amqp'
import { getConfig } from './services/config'
import { getConfigRedis } from './services/config_redis'
import { getClientBaileys } from './services/client_baileys'
import { Incoming } from './services/incoming'
import { OnNewLogin } from './services/on_new_login'
import logger from './services/logger'

const outgoingAmqp: Outgoing = new OutgoingAmqp(getConfigRedis)
const incomingAmqp: Incoming = new IncomingAmqp()

const getConfig: getConfig = getConfigRedis

const onNewLogin = new OnNewLogin(outgoingAmqp)
const bindJob = new BindJob()

const startWorker = async () => {
  await startRedis()

  logger.debug('Starting Worker')

  const sessionStore: SessionStore = new SessionStoreRedis()

  logger.debug('Starting bind consumer')
  await amqpConsume(UNOAPI_JOB_BIND, '', bindJob.consume.bind(bindJob))

  logger.debug('Started worker')

  await autoConnect(sessionStore, incomingAmqp, outgoingAmqp, getConfigRedis, getClientBaileys, onNewLogin.run.bind(onNewLogin))
}
startWorker()

// eslint-disable-next-line @typescript-eslint/no-explicit-any
process.on('unhandledRejection', (reason: any, promise) => {
  logger.error('unhandledRejection: %s %s %s', reason, reason.stack, promise)
  throw reason
})
