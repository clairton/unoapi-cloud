import request from 'supertest'

import { App } from '../../src/app'
import { Incoming } from '../../src/services/incoming'
import { getFileDataStore } from '../../src/services/get_file_data_store'

describe('index routes', () => {
  test('ping', async () => {
    const service: Incoming = {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      async send(_phone: string, _payload: object) {
        return {}
      },
    }
    const app: App = new App(service, '', getFileDataStore)
    const res = await request(app.server).get('/ping')
    expect(res.text).toEqual('pong!')
  })
})
