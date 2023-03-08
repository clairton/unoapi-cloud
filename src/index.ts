import { App } from './app'
import { IncomingBaileys } from './services/incoming_baileys'
import { Incoming } from './services/incoming'
import { Outgoing } from './services/outgoing'
import { OutgoingCloudApi } from './services/outgoing_cloud_api'
import { getStoreFile } from './services/store_file'
import { SessionStoreFile } from './services/session_store_file'
import { SessionStore } from './services/session_store'
import { autoConnect } from './services/auto_connect'
import { getDataStoreFile } from './services/data_store_file'
import { getClientBaileys } from './services/client_baileys'

const { WEBHOOK_URL, WEBHOOK_TOKEN, WEBHOOK_HEADER, BASE_URL, PORT } = process.env
const port: number = parseInt(PORT || '9876')

const cloudApi: Outgoing = new OutgoingCloudApi(
  WEBHOOK_URL || `http://localhost:${PORT}/webhooks/whatsapp`,
  WEBHOOK_TOKEN || 'abc123',
  WEBHOOK_HEADER || 'Authorization',
)
const baileys: Incoming = new IncomingBaileys(getStoreFile, cloudApi, getClientBaileys)
const app: App = new App(baileys, BASE_URL || `http://localhost:${port}`, getDataStoreFile)

app.server.listen(port, '0.0.0.0', async () => {
  console.info('Baileys Cloud API listening on port:', port)
  console.info('Successful started app!')
  const sessionStore: SessionStore = new SessionStoreFile()
  autoConnect(getClientBaileys, sessionStore, cloudApi, getStoreFile)
})

export default app
