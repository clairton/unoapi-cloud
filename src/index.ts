import * as dotenv from 'dotenv'
dotenv.config()

import { App } from './app'
import { IncomingBaileys } from './services/incoming_baileys'
import { Incoming } from './services/incoming'
import { Outgoing } from './services/outgoing'
import { OutgoingCloudApi } from './services/outgoing_cloud_api'
import { SessionStoreFile } from './services/session_store_file'
import { SessionStore } from './services/session_store'
import { autoConnect } from './services/auto_connect'
import { ClientConfig, defaultClientConfig } from './services/client'

const { WEBHOOK_URL, WEBHOOK_TOKEN, WEBHOOK_HEADER, BASE_URL, IGNORE_GROUP_MESSAGES, IGNORE_BROADCAST_STATUS, PORT } = process.env
const port: number = parseInt(PORT || '9876')

const cloudApi: Outgoing = new OutgoingCloudApi(
  WEBHOOK_URL || `http://localhost:${port}/webhooks/whatsapp`,
  WEBHOOK_TOKEN || 'abc123',
  WEBHOOK_HEADER || 'Authorization',
)

const config: ClientConfig = defaultClientConfig
config.ignoreGroupMessages = !!IGNORE_GROUP_MESSAGES
config.ignoreBroadcastStatus = !!IGNORE_BROADCAST_STATUS

console.debug('ClientConfig', config)

const baileys: Incoming = new IncomingBaileys(cloudApi, config)
const app: App = new App(baileys, BASE_URL || `http://localhost:${port}`)

app.server.listen(port, '0.0.0.0', async () => {
  console.info('Baileys Cloud API listening on port:', port)
  console.info('Successful started app!')
  const sessionStore: SessionStore = new SessionStoreFile()
  autoConnect(sessionStore, cloudApi)
})

export default app
