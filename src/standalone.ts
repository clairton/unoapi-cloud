import dotenv from 'dotenv'
dotenv.config({ path: process.env.DOTENV_CONFIG_PATH || '.env' })

import {
  BASE_URL,
  PORT,
  UNOAPI_JOB_BIND,
  UNOAPI_JOB_BIND_BRIDGE,
  UNOAPI_JOB_BIND_BROKER,
  UNOAPI_JOB_LOGOUT,
  UNOAPI_JOB_RELOAD,
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
import { isInBlacklistInMemory, addToBlacklistInMemory, addToBlacklist, addToBlacklistRedis, addToBlacklistJob, isInBlacklist, isInBlacklistInRedis } from './services/blacklist'
import { Listener } from './services/listener'
import { ListenerBaileys } from './services/listener_baileys'
import middleware from './services/middleware'
import { middlewareNext } from './services/middleware_next'
import security from './services/security'
import { ReloadBaileys } from './services/reload_baileys'
import { LogoutBaileys } from './services/logout_baileys'
import { ListenerAmqp } from './services/listener_amqp'
import { ReloadAmqp } from './services/reload_amqp'
import { Reload } from './services/reload'
import { Logout } from './services/logout'
import { LogoutAmqp } from './services/logout_amqp'
import { ReloadJob } from './jobs/reload'
import { BindBrokerJob } from './jobs/bind_broker'
import { amqpConnect, amqpConsume } from './amqp'
import { startRedis } from './services/redis'
import ContactBaileys from './services/contact_baileys'
import injectRouteDummy from './services/inject_route_dummy'
import { Contact } from './services/contact'
import { LogoutJob } from './jobs/logout'
import { BindBridgeJob } from './jobs/bind_bridge'

const broadcast: Broadcast = new Broadcast()

let addToBlacklistVar: addToBlacklist = addToBlacklistInMemory
let isInBlacklistVar: isInBlacklist = isInBlacklistInMemory
let outgoing: Outgoing = new OutgoingCloudApi(getConfigByEnv, isInBlacklistVar)
let getConfigVar: getConfig = getConfigByEnv
let sessionStore: SessionStore = new SessionStoreFile()
let listener: Listener = new ListenerBaileys(outgoing, broadcast, getConfigVar)
let onNewLoginn: OnNewLogin = onNewLoginAlert(listener)
let incoming: Incoming = new IncomingBaileys(listener, getConfigVar, getClientBaileys, onNewLoginn)
let reload: Reload = new ReloadBaileys(getClientBaileys, getConfigVar, listener, incoming, onNewLoginn)
let logout: Logout = new LogoutBaileys(getClientBaileys, getConfigVar, listener, incoming, onNewLoginn)
let middlewareVar: middleware = middlewareNext

if (process.env.REDIS_URL) {
  logger.info('Starting with redis')
  startRedis().catch( error => {
    console.error(error, 'Erro on start')
    process.exit(1)
  })
  addToBlacklistVar = addToBlacklistRedis
  getConfigVar = getConfigRedis
  outgoing = new OutgoingCloudApi(getConfigVar, isInBlacklistInRedis)
  sessionStore = new SessionStoreRedis()
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
  incoming = new IncomingAmqp()
  listener = new ListenerAmqp()
  reload = new ReloadAmqp()
  listener = new ListenerAmqp()
  logout = new LogoutAmqp()
  const reloadJob = new ReloadJob(reload)
  const bindBrokerJob = new BindBrokerJob()
  const bindBridgeJob = new BindBridgeJob()
  const logoutJob = new LogoutJob(logout)
  logger.info('Starting bind broker consumer')
  amqpConsume(UNOAPI_JOB_BIND, UNOAPI_JOB_BIND_BROKER, bindBrokerJob.consume.bind(bindBrokerJob))
  logger.info('Starting bind listener consumer')
  amqpConsume(UNOAPI_JOB_BIND, UNOAPI_JOB_BIND_BRIDGE, bindBridgeJob.consume.bind(bindBridgeJob))
  logger.info('Starting reload consumer')
  amqpConsume(UNOAPI_JOB_RELOAD, '', reloadJob.consume.bind(reloadJob))
  logger.info('Starting logout consumer')
  amqpConsume(UNOAPI_JOB_LOGOUT, '', logoutJob.consume.bind(logoutJob))
} else {
  logger.info('Starting standard mode')
}

if (process.env.UNOAPI_AUTH_TOKEN) {
  logger.info('Starting http security')
  onNewLoginn = onNewLoginGenerateToken(outgoing)
  middlewareVar = security
} else {
  logger.info('Starting without http security')
}

const contact: Contact = new ContactBaileys(listener, getConfigVar, getClientBaileys, onNewLoginn, incoming)

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
  autoConnect(sessionStore, incoming, listener, getConfigVar, getClientBaileys, onNewLoginn)
})

// eslint-disable-next-line @typescript-eslint/no-explicit-any
process.on('unhandledRejection', (reason: any, promise) => {
  logger.error('unhandledRejection: %s', reason.stack)
  logger.error('promise: %s', promise)
  throw reason
})
