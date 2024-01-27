import request from 'supertest'
import { mock } from 'jest-mock-extended'

import { App } from '../../src/app'
import { Incoming } from '../../src/services/incoming'
import { getConfig } from '../../src/services/config'
import { Outgoing } from '../../src/services/outgoing'
import { SessionStore } from '../../src/services/session_store'
const sessionStore = mock<SessionStore>()

describe('index routes', () => {
  test('ping', async () => {
    const incoming = mock<Incoming>()
    const outgoing = mock<Outgoing>()
    const getConfig = mock<getConfig>()
    const app: App = new App(incoming, outgoing, '', getConfig, sessionStore)
    const res = await request(app.server).get('/ping')
    expect(res.text).toEqual('pong!')
  })
})
