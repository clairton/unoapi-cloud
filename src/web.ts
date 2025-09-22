import * as dotenv from 'dotenv'
dotenv.config()

import { App } from './app'
import { Incoming } from './services/incoming'
import { IncomingAmqp } from './services/incoming_amqp'
import { Outgoing } from './services/outgoing'
import { OutgoingAmqp } from './services/outgoing_amqp'
import { SessionStore } from './services/session_store'
import { SessionStoreRedis } from './services/session_store_redis'
import { 
  BASE_URL, 
  PORT,
  CONFIG_SESSION_PHONE_CLIENT,
  CONFIG_SESSION_PHONE_NAME,
  UNOAPI_QUEUE_BROADCAST,
  UNOAPI_EXCHANGE_BROKER_NAME,
  UNOAPI_QUEUE_RELOAD,
} from './defaults'
import { getConfigRedis } from './services/config_redis'
import security from './services/security'
import { amqpConsume } from './amqp'
import logger from './services/logger'
import { version } from '../package.json'
import { onNewLoginGenerateToken } from './services/on_new_login_generate_token'
import { addToBlacklistJob } from './services/blacklist'
import { Broadcast } from './services/broadcast'
import { BroacastJob } from './jobs/broadcast'
import { ReloadAmqp } from './services/reload_amqp'
import { LogoutAmqp } from './services/logout_amqp'
import { Reload } from './services/reload'

import * as Sentry from '@sentry/node'
if (process.env.SENTRY_DSN) {
  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    sendDefaultPii: true,
  })
}

const reload = new Reload()
const incoming: Incoming = new IncomingAmqp(getConfigRedis)
const outgoing: Outgoing = new OutgoingAmqp(getConfigRedis)
const sessionStore: SessionStore = new SessionStoreRedis()
const onNewLogin = onNewLoginGenerateToken(outgoing)
const broadcast: Broadcast = new Broadcast()
const reloadAmqp = new ReloadAmqp(getConfigRedis)
const logout = new LogoutAmqp(getConfigRedis)
import { ReloadJob } from './jobs/reload'
import Security from './services/security'
import middleware from './services/middleware'
const reloadJob = new ReloadJob(reloadAmqp)
const securityVar = new Security(sessionStore)
const middlewareVar = securityVar.run.bind(securityVar) as middleware

const app: App = new App(incoming, outgoing, BASE_URL, getConfigRedis, sessionStore, onNewLogin, addToBlacklistJob, reloadAmqp, logout, middlewareVar)
broadcast.setSever(app.socket)

const broadcastJob = new BroacastJob(broadcast)

app.server.listen(PORT, '0.0.0.0', async () => {
  logger.info('Starting broadcast consumer')
  await amqpConsume(UNOAPI_EXCHANGE_BROKER_NAME, UNOAPI_QUEUE_BROADCAST, '*', broadcastJob.consume.bind(broadcastJob), { type: 'topic' })
  await amqpConsume(UNOAPI_EXCHANGE_BROKER_NAME, UNOAPI_QUEUE_RELOAD, '*', reload.run.bind(reloadJob), { type: 'topic' })
  logger.info('Unoapi Cloud version: %s, listening on port: %s | Linked Device: %s(%s)', version, PORT, CONFIG_SESSION_PHONE_CLIENT, CONFIG_SESSION_PHONE_NAME)
})


process.on('uncaughtException', (reason: any) => {
  if (process.env.SENTRY_DSN) {
    Sentry.captureException(reason)
  }
  logger.error('uncaughtException web: %s %s', reason, reason.stack)
  process.exit(1)
})

process.on('unhandledRejection', (reason: any, promise) => {
  if (process.env.SENTRY_DSN) {
    Sentry.captureException(reason)
  }
  logger.error('unhandledRejection: %s', reason.stack)
  logger.error('promise: %s', promise)
  process.exit(1)
})
