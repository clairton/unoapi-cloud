jest.mock('baileys')
import { OnDisconnected, OnQrCode, OnReconnect, OnNotification, connect } from '../../src/services/socket'
import makeWASocket, { WASocket } from 'baileys'
import { mock } from 'jest-mock-extended'
import { Store } from '../../src/services/store'
import { defaultConfig } from '../../src/services/config'
import logger from '../../src/services/logger'
import { SessionStore } from '../../src/services/session_store'
const mockMakeWASocket = makeWASocket as jest.MockedFunction<typeof makeWASocket>

describe('service socket', () => {
  let phone: string
  let store: Store
  let mockWaSocket
  let mockBaileysEventEmitter
  let mockOn
  let onQrCode: OnQrCode
  let onNotification: OnNotification
  let onDisconnected: OnDisconnected
  let onReconnect: OnReconnect
  const onNewLogin = async (phone: string) => {
    logger.info('New login', phone)
  }

  beforeEach(async () => {
    phone = `${new Date().getMilliseconds()}`
    store = mock<Store>()
    store.sessionStore = mock<SessionStore>()
    mockWaSocket = mock<WASocket>()
    mockBaileysEventEmitter = mock<typeof mockWaSocket.ev>()
    Reflect.set(mockWaSocket, 'ev', mockBaileysEventEmitter)
    mockOn = jest.spyOn(mockWaSocket.ev, 'on')
    mockMakeWASocket.mockReturnValue(mockWaSocket)
    onQrCode = jest.fn()
    onNotification = jest.fn()
    onDisconnected = jest.fn()
    onReconnect = jest.fn()
  })

  test('call connect status connected false', async () => {
    const response = await connect({
      phone,
      store,
      onQrCode,
      onNotification,
      onDisconnected,
      onReconnect,
      onNewLogin,
      attempts: 1,
      time: 1,
      config: defaultConfig,
    })
    expect(response.status.attempt).toBe(1)
  })

  test('call connect and subscribe 2 events', async () => {
    await connect({ phone, store, onQrCode, onNotification, onDisconnected, onReconnect, onNewLogin, attempts: 1, time: 1, config: defaultConfig })
    expect(mockOn).toBeCalledTimes(2)
  })
})
