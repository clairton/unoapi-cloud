import { App } from './app'
import { Baileys } from './services/baileys'
import { Incoming } from './services/incoming'
import { MultiFileStore as store } from './services/multi_file_store'

const service: Incoming = new Baileys(store)

const app: App = new App(service)

const PORT: number = parseInt(process.env.PORT || '9876')

app.server.listen(PORT, async () => {
  console.info('Baileys Cloud API listening on port:', PORT)
  console.info('Successful started app!')
})

export default app
