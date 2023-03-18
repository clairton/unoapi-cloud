import request from 'supertest'

import { App } from '../../src/app'
import { Incoming } from '../../src/services/incoming'
import { Outgoing } from '../../src/services/outgoing'
import { getDataStoreFile } from '../../src/services/data_store_file'
import { Response } from '../../src/services/response'

describe('webhook routes', () => {
  test('whatsapp', async () => {
    const incoming: Incoming = {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      async send(_phone: string, _payload: object) {
        const r: Response = { ok: { any: '1' }, to: 'dknfsdkf' }
        return r
      },
    }
    const outgoing: Outgoing = {
      // eslint-disable-next-line @typescript-eslint/no-empty-function, @typescript-eslint/no-unused-vars
      sendMany: async function (phone: string, messages: object[]) {},
      // eslint-disable-next-line @typescript-eslint/no-empty-function, @typescript-eslint/no-unused-vars
      sendOne: async function (phone: string, message: object) {},
      // eslint-disable-next-line @typescript-eslint/no-empty-function, @typescript-eslint/no-unused-vars
      send: async function (phone: string, message: object) {},
    }
    const app: App = new App(incoming, outgoing, '', getDataStoreFile)
    const res = await request(app.server).post('/webhooks/whatsapp/123')
    expect(res.status).toEqual(200)
  })
})
