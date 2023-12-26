import * as dotenv from 'dotenv'
dotenv.config()

import { App } from './app'
import { Incoming } from './services/incoming'
import { IncomingAmqp } from './services/incoming_amqp'
import { Outgoing } from './services/outgoing'
import { OutgoingAmqp } from './services/outgoing_amqp'
import { getClientBaileys } from './services/client_baileys'
import { BASE_URL, PORT, AMQP_URL, UNOAPI_JOB_INCOMING, UNOAPI_MESSAGE_RETRY_DELAY } from './defaults'
import { getConfigRedis } from './services/config_redis'
import security from './services/security'
import injectRoute from './services/inject_route'
import { Router } from 'express'
import { ConfigController } from './controllers/config'
import { OnNewLogin } from './services/on_new_login'
import { amqpGetChannel } from './amqp'
import logger from './services/logger'

const incoming: Incoming = new IncomingAmqp()
const outgoing: Outgoing = new OutgoingAmqp(getConfigRedis)
const onNewLogin = new OnNewLogin(outgoing)

const configController = new ConfigController(outgoing, incoming, getConfigRedis, getClientBaileys, onNewLogin.run.bind(onNewLogin))

const injectRoute: injectRoute = async (router: Router) => {
  router.get('/:phone', security, configController.get)
  router.post('/:phone', security, configController.set)
}

const app: App = new App(incoming, outgoing, BASE_URL, getConfigRedis, getClientBaileys, security, injectRoute)

app.server.listen(PORT, '0.0.0.0', async () => {
  await amqpGetChannel(UNOAPI_JOB_INCOMING, '', AMQP_URL, { delay: UNOAPI_MESSAGE_RETRY_DELAY, priority: 5 }) // create a channel with priority
  logger.info('Unoapi Cloud Pro listening on port: %s', PORT)
  logger.info('Successful started app!')
})
