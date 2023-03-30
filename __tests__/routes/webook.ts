import request from 'supertest'
import { mock } from 'jest-mock-extended'

import { App } from '../../src/app'
import { Incoming } from '../../src/services/incoming'
import { Outgoing } from '../../src/services/outgoing'
import { defaultConfig, getConfig } from '../../src/services/config'

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const getConfigTest: getConfig = async (_phone: string) => {
  return defaultConfig
}

describe('webhook routes', () => {
  test('whatsapp', async () => {
    const incoming = mock<Incoming>()
    const outgoing = mock<Outgoing>()
    const app: App = new App(incoming, outgoing, '', getConfigTest)
    const res = await request(app.server).post('/webhooks/whatsapp/123')
    expect(res.status).toEqual(200)
  })
})
