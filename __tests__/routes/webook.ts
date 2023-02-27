import request from 'supertest'

import { App } from '../../src/app'
import { Incoming } from '../../src/services/incoming'

describe('webhook routes', () => {
  test('whatsapp', async () => {
    const service: Incoming = {
      send(_phone, _payload) {
        return true
      },
    }
    const app: App = new App(service)
    const res = await request(app.server).post('/webhooks/whatsapp/123')
    expect(res.status).toEqual(200)
  })
})
