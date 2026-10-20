import request from 'supertest'
import { mock } from 'jest-mock-extended'

import { App } from '../../src/app'
import { Incoming } from '../../src/services/incoming'
import { Outgoing } from '../../src/services/outgoing'
import { Store } from '../../src/services/store'
import { Config, getConfig } from '../../src/services/config'
import { SessionStore } from '../../src/services/session_store'
import { OnNewLogin } from '../../src/services/socket'
import { addToBlacklist } from '../../src/services/blacklist'
import { Reload } from '../../src/services/reload'
import { Logout } from '../../src/services/logout'

const sessionStore = mock<SessionStore>()
const store = mock<Store>()
const config = mock<Config>()
config.authToken = 'abc'

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const getConfigTest: getConfig = async (_phone: string) => config

const app = () =>
  new App(
    mock<Incoming>(),
    mock<Outgoing>(),
    '',
    getConfigTest,
    sessionStore,
    mock<OnNewLogin>(),
    mock<addToBlacklist>(),
    mock<Reload>(),
    mock<Logout>(),
  )

describe('phone numbers routes', () => {
  beforeEach(() => {
    jest.spyOn(sessionStore, 'getPhones').mockResolvedValue(['+5549999012020'])
    jest.spyOn(config, 'getStore').mockResolvedValue({ ...store, sessionStore })
    jest.spyOn(sessionStore, 'getStatus').mockResolvedValue('online')
  })

  // Typebot (setupMetaWebhook) find the number in this list by id, like graph api phone number id
  test('phone_numbers return id and display_phone_number', async () => {
    const res = await request(app().server)
      .get('/v17.0/5549999012020/phone_numbers?fields=id,display_phone_number&limit=100')
      .set('Authorization', 'Bearer abc')
    expect(res.status).toEqual(200)
    expect(res.body.data[0].id).toEqual('5549999012020')
    expect(res.body.data[0].display_phone_number).toEqual('5549999012020')
  })

  // Typebot reads it before subscribe, the app id must be the same of debug_token
  test('subscribed_apps return unoapi app', async () => {
    const debug = await request(app().server).get('/v17.0/debug_token?input_token=abc')
    const res = await request(app().server).get('/v17.0/5549999012020/subscribed_apps')
    expect(res.status).toEqual(200)
    expect(res.body.data[0].whatsapp_business_api_data.id).toEqual(debug.body.data.app_id)
  })

  test('subscribe app return success', async () => {
    const res = await request(app().server).post('/v17.0/5549999012020/subscribed_apps')
    expect(res.status).toEqual(200)
    expect(res.body).toEqual({ success: true })
  })
})
