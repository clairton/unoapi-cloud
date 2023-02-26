import request from 'supertest'

import { App } from '../../src/app'
import { Incoming } from '../../src/services/incoming'

describe('index routes', () => {
  test('ping', async () => {
    const service: Incoming = {
      send(_phone, _payload) {
        return true
      },
    }
    const app: App = new App(service)
    const res = await request(app.server).get('/ping')
    expect(res.text).toEqual('pong!')
  })
})
