import { App } from './app'
import { Baileys } from './services/baileys'
import { Incoming } from './services/incoming'
import { Outgoing } from './services/outgoing'
import { CloudApi } from './services/cloud_api'
import { multiFileStore } from './services/multi_file_store'
const { WEBHOOK_URL, WEBHOOK_TOKEN, WEBHOOK_HEADER } = process.env

const cloudApi: Outgoing = new CloudApi(WEBHOOK_URL || 'http://localhost:9876', WEBHOOK_TOKEN || 'abc123', WEBHOOK_HEADER || 'Authorization')
const baileys: Incoming = new Baileys(multiFileStore, cloudApi)
const app: App = new App(baileys)
const PORT: number = parseInt(process.env.PORT || '9876')
app.server.listen(PORT, async () => {
  console.info('Baileys Cloud API listening on port:', PORT)
  console.info('Successful started app!')
})

export default app
