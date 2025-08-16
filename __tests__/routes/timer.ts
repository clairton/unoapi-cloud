import { mock } from 'jest-mock-extended'
jest.mock('../../src/services/timer')

import request from 'supertest'
import { start, stop } from '../../src/services/timer'
import { App } from '../../src/app'
import { Incoming } from '../../src/services/incoming'
import { Outgoing } from '../../src/services/outgoing'
import { defaultConfig, getConfig } from '../../src/services/config'
import { SessionStore } from '../../src/services/session_store'
import { OnNewLogin } from '../../src/services/socket'
import { addToBlacklist } from '../../src/services/blacklist'
import { Reload } from '../../src/services/reload'
import { Logout } from '../../src/services/logout'
const addToBlacklist = mock<addToBlacklist>()
const startMock = start as jest.MockedFunction<typeof start>
const stopMock = start as jest.MockedFunction<typeof stop>

const sessionStore = mock<SessionStore>()
const getConfigTest: getConfig = async (_phone: string) => {
  return defaultConfig
}

describe('timer routes', () => {
  test('start', async () => {
    const incoming = mock<Incoming>()
    const outgoing = mock<Outgoing>()
    const onNewLogin = mock<OnNewLogin>()
    const reload = mock<Reload>()
    const logout = mock<Logout>()
    const app: App = new App(incoming, outgoing, '', getConfigTest, sessionStore, onNewLogin, addToBlacklist, reload, logout)
    const phone = 'x'
    const to = 'y'
    const json = {
      message: '123',
      timeout: 1,
    }
    startMock.mockResolvedValue(Promise.resolve())
    const res = await request(app.server).post(`/timer/${phone}/${to}`).send(json)
    expect(res.status).toEqual(200)
    expect(startMock).toHaveBeenCalledTimes(1)
  })
  test('stop', async () => {
    const incoming = mock<Incoming>()
    const outgoing = mock<Outgoing>()
    const onNewLogin = mock<OnNewLogin>()
    const reload = mock<Reload>()
    const logout = mock<Logout>()
    const app: App = new App(incoming, outgoing, '', getConfigTest, sessionStore, onNewLogin, addToBlacklist, reload, logout)
    const phone = 'x'
    const to = 'y'
    stopMock.mockResolvedValue(Promise.resolve())
    const res = await request(app.server).delete(`/timer/${phone}/${to}`)
    expect(res.status).toEqual(200)
    expect(stopMock).toHaveBeenCalledTimes(1)
  })
})
