import request from 'supertest'
import { mock } from 'jest-mock-extended'

import { App } from '../../src/app'
import { Incoming } from '../../src/services/incoming'
import { Outgoing } from '../../src/services/outgoing'
import { getDataStore } from '../../src/services/data_store'
import { getMediaStore } from '../../src/services/media_store'

describe('webhook routes', () => {
  test('whatsapp', async () => {
    const incoming = mock<Incoming>()
    const outgoing = mock<Outgoing>()
    const getDataStore = mock<getDataStore>()
    const getMediaStore = mock<getMediaStore>()
    const app: App = new App(incoming, outgoing, '', getMediaStore, getDataStore)
    const res = await request(app.server).post('/webhooks/whatsapp/123')
    expect(res.status).toEqual(200)
  })
})
