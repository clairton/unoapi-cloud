import request from 'supertest'
import { mock } from 'jest-mock-extended'
import { App } from '../../src/app'
import { Incoming } from '../../src/services/incoming'
import { Outgoing } from '../../src/services/outgoing'
import { defaultConfig, getConfig } from '../../src/services/config'
import { SessionStore } from '../../src/services/session_store'
import { OnNewLogin } from '../../src/services/socket'
import { Reload } from '../../src/services/reload'
import { Logout } from '../../src/services/logout'

const addToBlacklist = jest.fn().mockReturnValue(Promise.resolve(true))

const sessionStore = mock<SessionStore>()
const getConfigTest: getConfig = async (_phone: string) => {
  return defaultConfig
}

describe('blacklist routes', () => {
  test('update', async () => {
    const incoming = mock<Incoming>()
    const outgoing = mock<Outgoing>()
    const onNewLogin = mock<OnNewLogin>()
    const reload = mock<Reload>()
    const logout = mock<Logout>()
    const app: App = new App(incoming, outgoing, '', getConfigTest, sessionStore, onNewLogin, addToBlacklist, reload, logout)
    const res = await request(app.server).post('/2/blacklist/1').send({ ttl: 1, to: '3' })
    expect(addToBlacklist).toHaveBeenCalledWith('2', '1', '3', 1)
    expect(res.status).toEqual(200)
  })
})
