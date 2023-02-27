import request from 'supertest'

import { App } from '../../src/app'
import { Incoming } from '../../src/services/incoming'

class DummyIncoming implements Incoming {
  public async send(_phone: any, _payload: any) {
    return true
  }
}

describe('messages routes', () => {
  test('whatsapp', async () => {
    const phone = '123'
    const json = { data: 1 }
    const service: Incoming = new DummyIncoming()
    const sendSpy = jest.spyOn(service, 'send')
    const app: App = new App(service)
    const res = await request(app.server).post(`/v15.0/${phone}/messages`).send(json)
    expect(res.status).toEqual(200)
    expect(sendSpy).toHaveBeenCalledWith(phone, json)
  })
})
