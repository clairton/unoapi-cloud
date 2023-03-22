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
import { MessageFilter } from './services/message_filter'
const {
  WEBHOOK_URL,
  WEBHOOK_TOKEN,
  WEBHOOK_HEADER,
  BASE_URL,
  IGNORE_GROUP_MESSAGES,
  IGNORE_OWN_MESSAGES,
  IGNORE_BROADCAST_STATUSES,
  IGNORE_BROADCAST_MESSAGES,
  IGNORE_CALLS,
  SEND_CONNECTION_STATUS,
  PORT,
  WEBHOOK_CALLS_MESSAGE,
} = process.env
const port: number = parseInt(PORT || '9876')

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const _undefined: any = undefined
const config: ClientConfig = defaultClientConfig
config.ignoreGroupMessages = IGNORE_GROUP_MESSAGES == _undefined ? true : IGNORE_GROUP_MESSAGES == 'true'
config.ignoreBroadcastStatuses = IGNORE_BROADCAST_STATUSES === _undefined ? true : IGNORE_BROADCAST_STATUSES == 'true'
config.ignoreBroadcastMessages = IGNORE_BROADCAST_MESSAGES === _undefined ? false : IGNORE_OWN_MESSAGES == 'true'
config.ignoreOwnMessages = IGNORE_OWN_MESSAGES === _undefined ? true : IGNORE_OWN_MESSAGES == 'true'
config.sendConnectionStatus = SEND_CONNECTION_STATUS === _undefined ? true : SEND_CONNECTION_STATUS == 'true'
config.ignoreCalls = IGNORE_CALLS || ''
config.webhookCallsMessage = WEBHOOK_CALLS_MESSAGE || ''

const filter: MessageFilter = new MessageFilter(config)

const cloudApi: Outgoing = new OutgoingCloudApi(
  filter,
  WEBHOOK_URL || `http://localhost:${port}/webhooks/whatsapp`,
  WEBHOOK_TOKEN || 'abc123',
  WEBHOOK_HEADER || 'Authorization',
)

console.debug('ClientConfig', config)

const baileys: Incoming = new IncomingBaileys(cloudApi, config)
const app: App = new App(baileys, cloudApi, BASE_URL || `http://localhost:${port}`)

app.server.listen(port, '0.0.0.0', async () => {
  console.info('Unoapi Cloud listening on port:', port)
  console.info('Successful started app!')
  const sessionStore: SessionStore = new SessionStoreFile()
  autoConnect(sessionStore, cloudApi)
})

export default app
