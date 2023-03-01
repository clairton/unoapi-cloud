import { App } from './app'
import { Baileys } from './services/baileys'
import { Incoming } from './services/incoming'
import { Outgoing } from './services/outgoing'
import { CloudApi } from './services/cloud_api'
import { fileStore } from './services/file_store'
import { getFileDataStore } from './services/get_file_data_store'
const { WEBHOOK_URL, WEBHOOK_TOKEN, WEBHOOK_HEADER, BASE_URL } = process.env
const PORT: number = parseInt(process.env.PORT || '9876')
const cloudApi: Outgoing = new CloudApi(
  WEBHOOK_URL || `http://localhost:${PORT}/webhooks/whatsapp`,
  WEBHOOK_TOKEN || 'abc123',
  WEBHOOK_HEADER || 'Authorization',
)
const baileys: Incoming = new Baileys(fileStore, cloudApi)
const app: App = new App(baileys, BASE_URL || `http://localhost:${PORT}`, getFileDataStore)
app.server.listen(PORT, async () => {
  console.info('Baileys Cloud API listening on port:', PORT)
  console.info('Successful started app!')
})

export default app
