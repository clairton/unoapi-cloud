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
const { PORT, BASE_URL } = process.env
const port: number = parseInt(PORT || '9876')
import { v1 as uuid } from 'uuid'
import { phoneNumberToJid } from './services/transformer'
import { OnNewLogin } from './services/socket'

const outgoingCloudApi: Outgoing = new OutgoingCloudApi(getConfigByEnv)

const onNewLogin: OnNewLogin = async (phone: string) => {
  const message = `Please be careful, the http endpoint is unprotected and if it is exposed in the network, someone else can send message as you!`
  const payload = {
    key: {
      remoteJid: phoneNumberToJid(phone),
      id: uuid(),
    },
    message: {
      conversation: message,
    },
    messageTimestamp: new Date().getTime(),
  }
  outgoingCloudApi.sendOne(phone, payload)
}

const incomingBaileys: Incoming = new IncomingBaileys(outgoingCloudApi, getConfigByEnv, getClientBaileys, onNewLogin)
const app: App = new App(incomingBaileys, outgoingCloudApi, BASE_URL || `http://localhost:${port}`, getConfigByEnv)

app.server.listen(port, '0.0.0.0', async () => {
  console.info('Unoapi Cloud listening on port:', port)
  console.info('Successful started app!')
  const sessionStore: SessionStore = new SessionStoreFile()
  autoConnect(sessionStore, incomingBaileys, outgoingCloudApi, getConfigByEnv, getClientBaileys, onNewLogin)
})

export default app

// eslint-disable-next-line @typescript-eslint/no-explicit-any
process.on('unhandledRejection', (reason: any, promise) => {
  console.error('unhandledRejection:', reason.stack)
  console.error('promise:', promise)
  throw reason
})
