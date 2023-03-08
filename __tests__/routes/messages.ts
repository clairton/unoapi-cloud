import request from 'supertest'

import { App } from '../../src/app'
import { Incoming } from '../../src/services/incoming'
import { getDataStoreFile } from '../../src/services/get_data_store_file'

class DummyIncoming implements Incoming {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  public async send(_phone: unknown, _payload: object) {
    return {}
  }
}

const phone = `${new Date().getTime()}`
const json = { data: `${new Date().getTime()}` }
const service: Incoming = new DummyIncoming()
const app: App = new App(service, '', getDataStoreFile)

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
