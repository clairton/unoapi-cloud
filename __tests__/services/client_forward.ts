jest.mock('../../src/services/socket')
import { Client } from '../../src/services/client'
import { Config, getConfig, defaultConfig } from '../../src/services/config'
import { Listener } from '../../src/services/listener'
import { Store } from '../../src/services/store'
import { mock } from 'jest-mock-extended'
import { DataStore } from '../../src/services/data_store'
import { SessionStore } from '../../src/services/session_store'
import { ClientForward } from '../../src/services/client_forward'

describe('service client forward', () => {
  let client: Client
  let phone: string
  let listener: Listener
  let store: Store
  let dataStore: DataStore
  let sessionStore: SessionStore
  let getConfig: getConfig
  let config: Config

  beforeEach(async () => {
    phone = `${new Date().getMilliseconds()}`
    listener = mock<Listener>()
    dataStore = mock<DataStore>()
    sessionStore = mock<SessionStore>()
    store = mock<Store>()
    store.dataStore = dataStore
    store.sessionStore = sessionStore
    config = defaultConfig
    config.ignoreGroupMessages = true
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    getConfig = async (_phone: string) => {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      config.getStore = async (_phone: string) => {
        return store
      }
      return config
    }
    client = new ClientForward(phone, getConfig, listener)
  })

  test('not update uno id', async () => {
    const payload = { status: 'read', message_id: '78f8f8f0-9c98-11f0-aa54-c714bee1dcd0', recipient_id: phone }
    const resp = await client.send(payload, {})
    expect(resp.ok.success).toBe(true)
  })
})
