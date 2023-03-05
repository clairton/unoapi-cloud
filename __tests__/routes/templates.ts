import request from 'supertest'

import { App } from '../../src/app'
import { Incoming } from '../../src/services/incoming'
import { getFileDataStore } from '../../src/services/get_file_data_store'

describe('templates routes', () => {
  test('index', async () => {
    const service: Incoming = {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      async send(_phone: string, _payload: object) {
        return {}
      },
    }
    const app: App = new App(service, '', getFileDataStore)
    const res = await request(app.server).get('/v15.0/123/message_templates')
    expect(res.status).toEqual(200)
  })
})
