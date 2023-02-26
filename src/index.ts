import { App } from './app'
import { Baileys } from './services/baileys'
import { Incoming } from './services/incoming'

const service: Incoming = new Baileys()

const app: App = new App(service)

const PORT: number = parseInt(process.env.PORT || '9876')

app.server.listen(PORT, async () => {
  console.info('Baileys Cloud API listening on port:', PORT)
  console.info('Successful started app!')
})

export default app
