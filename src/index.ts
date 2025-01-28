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
import { onNewLoginAlert } from './services/on_new_login_alert'
import { Broadcast } from './services/broadcast'
import { isInBlacklistInMemory, addToBlacklistInMemory } from './services/blacklist'
import { version } from '../package.json'

import logger from './services/logger'
import { Listener } from './services/listener'
import { ListenerBaileys } from './services/listener_baileys'

import { BASE_URL, PORT } from './defaults'
import { ReloadBaileys } from './services/reload_baileys'
import { LogoutBaileys } from './services/logout_baileys'
import { ReadWhenReceipt } from './services/read_when_receipt'

const outgoingCloudApi: Outgoing = new OutgoingCloudApi(getConfigByEnv, isInBlacklistInMemory)

const broadcast: Broadcast = new Broadcast()
const readWhenReceipt: ReadWhenReceipt = async (from, messageId) => {
  console.log('>>>>>>>>>>>>>>>>>>>>>>>>>>')
  const payload = {
    messaging_product: 'whatsapp',
    status: 'read',
    message_id: messageId
  }
  await incomingBaileys.send(from, payload, {})
}
const listenerBaileys: Listener = new ListenerBaileys(outgoingCloudApi, broadcast, getConfigByEnv, readWhenReceipt)
const onNewLoginn = onNewLoginAlert(listenerBaileys)
const incomingBaileys: Incoming = new IncomingBaileys(listenerBaileys, getConfigByEnv, getClientBaileys, onNewLoginn)
const sessionStore: SessionStore = new SessionStoreFile()

const reload = new ReloadBaileys(getClientBaileys, getConfigByEnv, listenerBaileys, onNewLoginn)
const logout = new LogoutBaileys(getClientBaileys, getConfigByEnv, listenerBaileys, onNewLoginn)

const app: App = new App(incomingBaileys, outgoingCloudApi, BASE_URL, getConfigByEnv, sessionStore, onNewLoginn, addToBlacklistInMemory, reload, logout)
broadcast.setSever(app.socket)

app.server.listen(PORT, '0.0.0.0', async () => {
  logger.info('Unoapi Cloud version: %s, listening on port: %s', version, PORT)
  autoConnect(sessionStore, listenerBaileys, getConfigByEnv, getClientBaileys, onNewLoginn)
})

export default app

// eslint-disable-next-line @typescript-eslint/no-explicit-any
process.on('unhandledRejection', (reason: any, promise) => {
  logger.error('unhandledRejection: %s', reason.stack)
  logger.error('promise: %s', promise)
  throw reason
})
