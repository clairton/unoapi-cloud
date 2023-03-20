import request from 'supertest'
import { mock } from 'jest-mock-extended'

import { App } from '../../src/app'
import { Incoming } from '../../src/services/incoming'
import { Outgoing } from '../../src/services/outgoing'
import { getDataStoreFile } from '../../src/services/data_store_file'

describe('webhook routes', () => {
  test('whatsapp', async () => {
    const incoming = mock<Incoming>()
    const outgoing = mock<Outgoing>()
    const app: App = new App(incoming, outgoing, '', getDataStoreFile)
    const res = await request(app.server).post('/webhooks/whatsapp/123')
    expect(res.status).toEqual(200)
  })
})
