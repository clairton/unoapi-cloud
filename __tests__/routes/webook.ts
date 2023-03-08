import request from 'supertest'

import { App } from '../../src/app'
import { Incoming } from '../../src/services/incoming'
import { getDataStoreFile } from '../../src/services/get_data_store_file'

describe('webhook routes', () => {
  test('whatsapp', async () => {
    const service: Incoming = {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      async send(_phone: string, _payload: object) {
        return {}
      },
    }
    const app: App = new App(service, '', getDataStoreFile)
    const res = await request(app.server).post('/webhooks/whatsapp/123')
    expect(res.status).toEqual(200)
  })
})
