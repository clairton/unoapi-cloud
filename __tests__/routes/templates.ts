import request from 'supertest'
import { mock } from 'jest-mock-extended'

import { App } from '../../src/app'
import { Incoming } from '../../src/services/incoming'
import { Outgoing } from '../../src/services/outgoing'
import { getDataStore } from '../../src/services/data_store'
import { getMediaStore } from '../../src/services/media_store'

describe('templates routes', () => {
  test('index', async () => {
    const incoming = mock<Incoming>()
    const outgoing = mock<Outgoing>()
    const getDataStore = mock<getDataStore>()
    const getMediaStore = mock<getMediaStore>()
    const app: App = new App(incoming, outgoing, '', getMediaStore, getDataStore)
    const res = await request(app.server).get('/v15.0/123/message_templates')
    expect(res.status).toEqual(200)
  })
})
