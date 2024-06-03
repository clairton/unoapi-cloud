import request from 'supertest'
import { mock } from 'jest-mock-extended'

import { App } from '../../src/app'
import { Incoming } from '../../src/services/incoming'
import { getConfig } from '../../src/services/config'
import { Outgoing } from '../../src/services/outgoing'
import { SessionStore } from '../../src/services/session_store'
import { OnNewLogin } from '../../src/services/socket'
import { addToBlacklist } from '../../src/services/blacklist'
const addToBlacklist = mock<addToBlacklist>()
const sessionStore = mock<SessionStore>()

describe('index routes', () => {
  test('ping', async () => {
    const incoming = mock<Incoming>()
    const outgoing = mock<Outgoing>()
    const getConfig = mock<getConfig>()
    const onNewLogin = mock<OnNewLogin>()
    const app: App = new App(incoming, outgoing, '', getConfig, sessionStore, onNewLogin, addToBlacklist)
    const res = await request(app.server).get('/ping')
    expect(res.text).toEqual('pong!')
  })
})
