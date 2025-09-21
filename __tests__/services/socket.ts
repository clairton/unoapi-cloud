jest.mock('@whiskeysockets/baileys', () => {
  const fn = jest.fn()
  return {
    __esModule: true,
    default: fn,
    makeWASocket: fn,
    Browsers: { ubuntu: (_: string) => ['Unoapi', 'Chrome', 'Linux'] },
    fetchLatestBaileysVersion: jest.fn(async () => ({ version: [2, 2, 2] })),
    DisconnectReason: { loggedOut: 401, connectionReplaced: 440, restartRequired: 515, badSession: 500 },
    delay: jest.fn(async () => {}),
    proto: {},
  }
})
jest.mock('@whiskeysockets/baileys/lib/Utils/logger', () => {
  const mockLogger = {
    level: 'info',
    child: () => ({ level: 'info' }),
  }
  return { __esModule: true, default: mockLogger }
})
import { OnDisconnected, OnQrCode, OnReconnect, OnNotification, connect } from '../../src/services/socket'
import makeWASocket, { WASocket, WAVersion } from '@whiskeysockets/baileys'
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
  let whatsappVersion = [1, 1, 1] as WAVersion
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
    mockOn = jest.spyOn(mockWaSocket.ev, 'process')
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
      config: { ...defaultConfig, whatsappVersion }
    })
    expect(response && response.status.attempt).toBe(1)
  })

  test('call connect and process', async () => {
    await connect({
      phone,
      store,
      onQrCode,
      onNotification,
      onDisconnected,
      onReconnect,
      onNewLogin,
      attempts: 1,
      time: 1,
      config: { ...defaultConfig, whatsappVersion } 
    })
    expect(mockOn).toHaveBeenCalled()
  })
})
