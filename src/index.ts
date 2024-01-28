import dotenv from 'dotenv'
dotenv.config({ path: process.env.DOTENV_CONFIG_PATH || '.env' })

import { App } from './app'
import { IncomingBaileys } from './services/incoming_baileys'
import { Incoming } from './services/incoming'
import { Outgoing } from './services/outgoing'
import { OutgoingCloudApi } from './services/outgoing_cloud_api'
import { SessionStoreFile } from './services/session_store_file'
import { SessionStore } from './services/session_store'
import { autoConnect } from './services/auto_connect'
import { getConfigByEnv } from './services/config_by_env'
import { getClientBaileys } from './services/client_baileys'
import { onNewLogin } from './services/new_login'

import logger from './services/logger'
import { Listener } from './services/listener'
import { ListenerBaileys } from './services/listener_baileys'

const { PORT, BASE_URL } = process.env
const port: number = parseInt(PORT || '9876')

const outgoingCloudApi: Outgoing = new OutgoingCloudApi(getConfigByEnv)

const listenerBaileys: Listener = new ListenerBaileys(outgoingCloudApi, getConfigByEnv)
const incomingBaileys: Incoming = new IncomingBaileys(listenerBaileys, getConfigByEnv, getClientBaileys, onNewLogin(listenerBaileys))
const sessionStore: SessionStore = new SessionStoreFile()

const app: App = new App(incomingBaileys, outgoingCloudApi, BASE_URL || `http://localhost:${port}`, getConfigByEnv, sessionStore)

app.server.listen(port, '0.0.0.0', async () => {
  logger.info(`Unoapi Cloud listening on port: ${port}`)
  logger.info('Successful started app!')
  autoConnect(sessionStore, incomingBaileys, listenerBaileys, getConfigByEnv, getClientBaileys, onNewLogin(listenerBaileys))
})

export default app

// eslint-disable-next-line @typescript-eslint/no-explicit-any
process.on('unhandledRejection', (reason: any, promise) => {
  logger.error('unhandledRejection: %s', reason.stack)
  logger.error('promise: %s', promise)
  throw reason
})
