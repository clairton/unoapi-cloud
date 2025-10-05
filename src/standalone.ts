import dotenv from 'dotenv'
dotenv.config({ path: process.env.DOTENV_CONFIG_PATH || '.env' })

import {
  BASE_URL,
  NOTIFY_FAILED_MESSAGES,
  PORT,
  UNOAPI_EXCHANGE_BRIDGE_NAME,
  UNOAPI_EXCHANGE_BROKER_NAME,
  UNOAPI_QUEUE_BIND,
  UNOAPI_QUEUE_BLACKLIST_ADD,
  UNOAPI_QUEUE_LOGOUT,
  UNOAPI_QUEUE_MEDIA,
  UNOAPI_QUEUE_NOTIFICATION,
  UNOAPI_QUEUE_OUTGOING,
  UNOAPI_QUEUE_OUTGOING_PREFETCH,
  UNOAPI_QUEUE_RELOAD,
  UNOAPI_SERVER_NAME,
} from './defaults'

import logger from './services/logger'
import { version } from '../package.json'
import { App } from './app'
import { Incoming } from './services/incoming'
import { IncomingBaileys } from './services/incoming_baileys'
import { IncomingAmqp } from './services/incoming_amqp'
import { Outgoing } from './services/outgoing'
import { OutgoingCloudApi } from './services/outgoing_cloud_api'
import { OutgoingAmqp } from './services/outgoing_amqp'
import { SessionStore } from './services/session_store'
import { SessionStoreFile } from './services/session_store_file'
import { SessionStoreRedis } from './services/session_store_redis'
import { autoConnect } from './services/auto_connect'
import { getConfig } from './services/config'
import { getConfigByEnv } from './services/config_by_env'
import { getConfigRedis } from './services/config_redis'
import { getClientBaileys } from './services/client_baileys'
import { OnNewLogin } from './services/socket'
import { onNewLoginAlert } from './services/on_new_login_alert'
import { onNewLoginGenerateToken } from './services/on_new_login_generate_token'
import { Broadcast } from './services/broadcast'
import { 
  isInBlacklistInMemory,
  addToBlacklistInMemory,
  addToBlacklist,
  addToBlacklistRedis,
  addToBlacklistJob,
  isInBlacklist,
  isInBlacklistInRedis
} from './services/blacklist'
import { Listener } from './services/listener'
import { ListenerBaileys } from './services/listener_baileys'
import middleware from './services/middleware'
import { middlewareNext } from './services/middleware_next'
import Security from './services/security'
import { ReloadBaileys } from './services/reload_baileys'
import { LogoutBaileys } from './services/logout_baileys'
import { ListenerAmqp } from './services/listener_amqp'
import { ReloadAmqp } from './services/reload_amqp'
import { Reload } from './services/reload'
import { Logout } from './services/logout'
import { LogoutAmqp } from './services/logout_amqp'
import { ReloadJob } from './jobs/reload'
import { amqpConnect, amqpConsume, amqpGetChannel, extractRoutingKeyFromBindingKey } from './amqp'
import { startRedis } from './services/redis'
import ContactBaileys from './services/contact_baileys'
import injectRouteDummy from './services/inject_route_dummy'
import { Contact } from './services/contact'
import { LogoutJob } from './jobs/logout'
import { BindBridgeJob } from './jobs/bind_bridge'
import atbl from './jobs/add_to_blacklist'
import { MediaJob } from './jobs/media'
import { OutgoingJob } from './jobs/outgoing'
import { NotificationJob } from './jobs/notification'
import { IncomingJob } from './jobs/incoming'

import * as Sentry from '@sentry/node'
if (process.env.SENTRY_DSN) {
  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    sendDefaultPii: true,
  })
}

const broadcast: Broadcast = new Broadcast()

let addToBlacklistVar: addToBlacklist = addToBlacklistInMemory
let isInBlacklistVar: isInBlacklist = isInBlacklistInMemory
let outgoing: Outgoing = new OutgoingCloudApi(getConfigByEnv, isInBlacklistVar, addToBlacklistVar)
let getConfigVar: getConfig = getConfigByEnv
let sessionStore: SessionStore = new SessionStoreFile()
let listener: Listener = new ListenerBaileys(outgoing, broadcast, getConfigVar)
let onNewLoginn: OnNewLogin = onNewLoginAlert(listener)
let incoming: Incoming = new IncomingBaileys(listener, getConfigVar, getClientBaileys, onNewLoginn)
let reload: Reload = new ReloadBaileys(getClientBaileys, getConfigVar, listener, onNewLoginn)
let logout: Logout = new LogoutBaileys(getClientBaileys, getConfigVar, listener, onNewLoginn)
let middlewareVar: middleware = middlewareNext
if (process.env.REDIS_URL) {
  logger.info('Starting with redis')
  startRedis().catch( error => {
    console.error(error, 'Erro on start')
    process.exit(1)
  })
  addToBlacklistVar = addToBlacklistRedis
  getConfigVar = getConfigRedis
  outgoing = new OutgoingCloudApi(getConfigVar, isInBlacklistInRedis, addToBlacklistVar)
  sessionStore = new SessionStoreRedis()
  const securityVar = new Security(sessionStore)
  middlewareVar = securityVar.run.bind(securityVar) as middleware
} else {
  logger.info('Starting with file system')
}

if (process.env.AMQP_URL) {
  logger.info('Starting with broker')
  amqpConnect().catch( error => {
    console.error(error, 'Erro on start rabbitmq')
    process.exit(1)
  })
  addToBlacklistVar = addToBlacklistJob
  outgoing = new OutgoingAmqp(getConfigVar)
  incoming = new IncomingAmqp(getConfigVar)
  listener = new ListenerAmqp()
  logout = new LogoutAmqp(getConfigVar)
  reload = new ReloadAmqp(getConfigVar)
  const reloadJob = new ReloadJob(reload)
  const bindBridgeJob = new BindBridgeJob()
  const logoutJob = new LogoutJob(logout)
  logger.info('Starting bind bridge consumer')
  amqpConsume(
    UNOAPI_EXCHANGE_BRIDGE_NAME,
    `${UNOAPI_QUEUE_BIND}.${UNOAPI_SERVER_NAME}`,
    '*',
    bindBridgeJob.consume.bind(bindBridgeJob),
    { type: 'direct' }
  )
  logger.info('Starting reload consumer')
  amqpConsume(
    UNOAPI_EXCHANGE_BRIDGE_NAME,
    `${UNOAPI_QUEUE_RELOAD}.${UNOAPI_SERVER_NAME}`,
    '',
    reloadJob.consume.bind(reloadJob),
    { type: 'direct' }
  )
  logger.info('Starting logout consumer')
  amqpConsume(
    UNOAPI_EXCHANGE_BRIDGE_NAME,
    `${UNOAPI_QUEUE_LOGOUT}.${UNOAPI_SERVER_NAME}`,
    '',
    logoutJob.consume.bind(logoutJob),
    { type: 'direct' }
  )
  logger.info('Starting media consumer')
  const mediaJob = new MediaJob(getConfigVar)
  amqpConsume(UNOAPI_EXCHANGE_BROKER_NAME, UNOAPI_QUEUE_MEDIA, '*', mediaJob.consume.bind(mediaJob), { type: 'topic' })
  const prefetch = UNOAPI_QUEUE_OUTGOING_PREFETCH
  logger.info('Binding queues consumer for server %s', UNOAPI_SERVER_NAME)
  const notifyFailedMessages = NOTIFY_FAILED_MESSAGES
  logger.info('Starting outgoing consumer %s', UNOAPI_SERVER_NAME)
  const outgoingCloudApi: Outgoing = new OutgoingCloudApi(getConfigRedis, isInBlacklistInRedis, addToBlacklistRedis)
  const outgoinJob = new OutgoingJob(getConfigVar, outgoingCloudApi)
  amqpConsume(
    UNOAPI_EXCHANGE_BROKER_NAME,
    UNOAPI_QUEUE_OUTGOING,
    '*',
    outgoinJob.consume.bind(outgoinJob), 
    { notifyFailedMessages, prefetch, type: 'topic' }
  )
  if (notifyFailedMessages) {
    logger.debug('Starting notification consumer %s', UNOAPI_SERVER_NAME)
    const notificationJob = new NotificationJob(incoming)
    amqpConsume(
      UNOAPI_EXCHANGE_BROKER_NAME,
      UNOAPI_QUEUE_NOTIFICATION,
      '*',
      notificationJob.consume.bind(notificationJob),
      { notifyFailedMessages: false, type: 'topic' })
  }

  logger.info('Starting blacklist add consumer %s', UNOAPI_SERVER_NAME)
  amqpConsume(UNOAPI_EXCHANGE_BROKER_NAME, UNOAPI_QUEUE_BLACKLIST_ADD, '*', atbl, { notifyFailedMessages, prefetch, type: 'topic' })

  // Consume provider-specific outgoing messages for Baileys sessions
  ;(async () => {
    const channel = await amqpGetChannel()
    await channel?.assertExchange('unoapi.outgoing', 'topic', { durable: true })
    await channel?.assertQueue('outgoing.baileys', { durable: true })
    await channel?.bindQueue('outgoing.baileys', 'unoapi.outgoing', 'provider.baileys.*')
    // Ensure Whatsmeow queues exist too (created but not consumed here)
    await channel?.assertQueue('outgoing.baileys.dlq', { durable: true })
    await channel?.assertQueue('outgoing.whatsmeow', { durable: true })
    await channel?.bindQueue('outgoing.whatsmeow', 'unoapi.outgoing', 'provider.whatsmeow.*')
    await channel?.assertQueue('outgoing.whatsmeow.dlq', { durable: true })
    const incomingBaileysWorker = new IncomingBaileys(listener, getConfigVar, getClientBaileys, onNewLoginn)
    const providerJob = new IncomingJob(incomingBaileysWorker, outgoing, getConfigVar)
    channel?.consume('outgoing.baileys', async (payload) => {
      if (!payload) {
        return
      }
      const phone = extractRoutingKeyFromBindingKey(payload.fields.routingKey)
      const data = JSON.parse(payload.content.toString())
      try {
        await providerJob.consume(phone, data)
      } catch (error) {
        logger.error(error, 'Error consuming provider.baileys message')
      }
      channel.ack(payload)
    })
  })()
} else {
  logger.info('Starting standard mode')
}

if (process.env.UNOAPI_AUTH_TOKEN) {
  logger.info('Starting http security')
  onNewLoginn = onNewLoginGenerateToken(outgoing)
  const securityVar = new Security(sessionStore)
  middlewareVar = securityVar.run.bind(securityVar) as middleware
} else {
  logger.info('Starting without http security')
}

const contact: Contact = new ContactBaileys(listener, getConfigVar, getClientBaileys, onNewLoginn)

const app: App = new App(
  incoming,
  outgoing,
  BASE_URL,
  getConfigVar,
  sessionStore,
  onNewLoginn,
  addToBlacklistVar,
  reload,
  logout,
  middlewareVar,
  injectRouteDummy,
  contact
)
broadcast.setSever(app.socket)

app.server.listen(PORT, '0.0.0.0', async () => {
  logger.info('Unoapi standalone mode up version: %s, listening on port: %s', version, PORT)
  autoConnect(sessionStore, listener, getConfigVar, getClientBaileys, onNewLoginn)
})

process.on('uncaughtException', (reason: any) => {
  if (process.env.SENTRY_DSN) {
    Sentry.captureException(reason)
  }
  logger.error('uncaughtException stadalone: %s %s', reason, reason.stack)
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