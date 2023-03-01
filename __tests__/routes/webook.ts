import request from 'supertest'

import { App } from '../../src/app'
import { Incoming } from '../../src/services/incoming'
import { getFileDataStore } from '../../src/services/get_file_data_store'

describe('webhook routes', () => {
  test('whatsapp', async () => {
    const service: Incoming = {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      send(_phone, _payload) {
        return true
      },
    }
    const app: App = new App(service, '', getFileDataStore)
    const res = await request(app.server).post('/webhooks/whatsapp/123')
    expect(res.status).toEqual(200)
  })
})
