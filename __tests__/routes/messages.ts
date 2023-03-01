import request from 'supertest'

import { App } from '../../src/app'
import { Incoming } from '../../src/services/incoming'
import { getFileDataStore } from '../../src/services/get_file_data_store'

class DummyIncoming implements Incoming {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  public async send(_phone: unknown, _payload: unknown) {
    return true
  }
}

const phone = `${new Date().getTime()}`
const json = { data: `${new Date().getTime()}` }
const service: Incoming = new DummyIncoming()
const app: App = new App(service, '', getFileDataStore)

describe('messages routes', () => {
  test('whatsapp with sucess', async () => {
    const sendSpy = jest.spyOn(service, 'send')
    const res = await request(app.server).post(`/v15.0/${phone}/messages`).send(json)
    expect(res.status).toEqual(200)
    expect(sendSpy).toHaveBeenCalledWith(phone, json)
  })

  test('whatsapp with error', async () => {
    jest.spyOn(service, 'send').mockRejectedValue(new Error('cannot login'))
    const res = await request(app.server).post(`/v15.0/${phone}/messages`).send(json)
    expect(res.status).toEqual(400)
  })
})
