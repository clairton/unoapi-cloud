import request from 'supertest'
import { mock } from 'jest-mock-extended'

import { App } from '../../src/app'
import { Incoming } from '../../src/services/incoming'
import { getDataStore } from '../../src/services/data_store'
import { getMediaStore } from '../../src/services/media_store'
import { Outgoing } from '../../src/services/outgoing'

describe('index routes', () => {
  test('ping', async () => {
    const incoming = mock<Incoming>()
    const outgoing = mock<Outgoing>()
    const getDataStore = mock<getDataStore>()
    const getMediaStore = mock<getMediaStore>()
    const app: App = new App(incoming, outgoing, '', getMediaStore, getDataStore)
    const res = await request(app.server).get('/ping')
    expect(res.text).toEqual('pong!')
  })
})
