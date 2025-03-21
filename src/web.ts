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

const incoming: Incoming = new IncomingAmqp()
const outgoing: Outgoing = new OutgoingAmqp(getConfigRedis)
const sessionStore: SessionStore = new SessionStoreRedis()
const onNewLogin = onNewLoginGenerateToken(outgoing)
const broadcast: Broadcast = new Broadcast()
const reload = new ReloadAmqp(getConfigRedis)
const logout = new LogoutAmqp(getConfigRedis)

const app: App = new App(incoming, outgoing, BASE_URL, getConfigRedis, sessionStore, onNewLogin, addToBlacklistJob, reload, logout, security)
broadcast.setSever(app.socket)

const broadcastJob = new BroacastJob(broadcast)

app.server.listen(PORT, '0.0.0.0', async () => {
  logger.info('Starting broadcast consumer')
  await amqpConsume(UNOAPI_EXCHANGE_BROKER_NAME, UNOAPI_QUEUE_BROADCAST, '*', broadcastJob.consume.bind(broadcastJob))
  logger.info('Unoapi Cloud version: %s, listening on port: %s | Linked Device: %s(%s)', version, PORT, CONFIG_SESSION_PHONE_CLIENT, CONFIG_SESSION_PHONE_NAME)
})
