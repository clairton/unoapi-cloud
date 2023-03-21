import request from 'supertest'
import { mock } from 'jest-mock-extended'

import { App } from '../../src/app'
import { Incoming } from '../../src/services/incoming'
import { Outgoing } from '../../src/services/outgoing'
import { getDataStoreFile } from '../../src/services/data_store_file'
import { Response } from '../../src/services/response'

let phone: string
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let json: any
let app: App
let incoming: Incoming
let outgoing: Outgoing

describe('messages routes', () => {
  beforeEach(() => {
    phone = `${new Date().getTime()}`
    outgoing = mock<Outgoing>()
    json = { data: `${new Date().getTime()}` }
    incoming = mock<Incoming>()
    app = new App(incoming, outgoing, '', getDataStoreFile)
  })

  test('whatsapp with sucess', async () => {
    const sendSpy = jest.spyOn(incoming, 'send')
    const r: Response = { ok: { any: '1' } }
    const p: Promise<Response> = new Promise((resolve) => resolve(r))
    jest.spyOn(incoming, 'send').mockReturnValue(p)
    const res = await request(app.server).post(`/v15.0/${phone}/messages`).send(json)
    expect(res.status).toEqual(200)
    expect(sendSpy).toHaveBeenCalledWith(phone, json)
  })

  test('whatsapp with 400 status', async () => {
    jest.spyOn(incoming, 'send').mockRejectedValue(new Error('cannot login'))
    const res = await request(app.server).post(`/v15.0/${phone}/messages`).send(json)
    expect(res.status).toEqual(400)
  })

  test('whatsapp with error', async () => {
    const response: Response = {
      error: { code: 1, title: 'humm' },
      to: phone,
      ok: { o: 'skjdh' },
    }
    const p: Promise<Response> = new Promise((resolve) => resolve(response))
    jest.spyOn(incoming, 'send').mockReturnValue(p)
    const sendSpy = jest.spyOn(outgoing, 'send')
    const res = await request(app.server).post(`/v15.0/${phone}/messages`).send(json)
    expect(sendSpy).toHaveBeenCalledWith(phone, response.error)
    expect(res.status).toEqual(200)
  })
})
