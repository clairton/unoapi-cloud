import request from 'supertest'

import { App } from '../../src/app'
import { Incoming } from '../../src/services/incoming'
import { Outgoing } from '../../src/services/outgoing'
import { getDataStoreFile } from '../../src/services/data_store_file'
import { Response } from '../../src/services/response'

class DummyIncoming implements Incoming {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  public async send(_phone: unknown, _payload: object) {
    const r: Response = { ok: { any: '1' }, to: 'dknfsdkf' }
    return r
  }
}
class DummyOutgoing implements Outgoing {
  // eslint-disable-next-line @typescript-eslint/no-empty-function, @typescript-eslint/no-unused-vars
  async sendMany(phone: string, messages: object[]) {}
  // eslint-disable-next-line @typescript-eslint/no-empty-function, @typescript-eslint/no-unused-vars
  async sendOne(phone: string, message: object) {}
  // eslint-disable-next-line @typescript-eslint/no-empty-function, @typescript-eslint/no-unused-vars
  async send(phone: string, message: object) {}
}

const phone = `${new Date().getTime()}`
const outgoing: Outgoing = new DummyOutgoing()
const json = { data: `${new Date().getTime()}` }
const incoming: Incoming = new DummyIncoming()
const app: App = new App(incoming, outgoing, '', getDataStoreFile)

describe('messages routes', () => {
  test('whatsapp with sucess', async () => {
    const sendSpy = jest.spyOn(incoming, 'send')
    const res = await request(app.server).post(`/v15.0/${phone}/messages`).send(json)
    expect(res.status).toEqual(200)
    expect(sendSpy).toHaveBeenCalledWith(phone, json)
  })

  test('whatsapp with error', async () => {
    jest.spyOn(incoming, 'send').mockRejectedValue(new Error('cannot login'))
    const res = await request(app.server).post(`/v15.0/${phone}/messages`).send(json)
    expect(res.status).toEqual(400)
  })
})
