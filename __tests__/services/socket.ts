jest.mock('@adiwajshing/baileys')
import { connect } from '../../src/services/socket'
import makeWASocket, { WASocket } from '@adiwajshing/baileys'
import { mock } from 'jest-mock-extended'
import { Store } from '../../src/services/store'
const mockMakeWASocket = makeWASocket as jest.MockedFunction<typeof makeWASocket>

describe('service socket', () => {
  let phone: string
  let store: Store
  let mockWaSocket
  let mockBaileysEventEmitter
  let mockOn
  let onQrCode
  let onStatus
  let onDisconnect
  const onNewLogin = async (phone: string) => {
    console.log('New login', phone)
  }

  beforeEach(async () => {
    phone = `${new Date().getMilliseconds()}`
    store = mock<Store>()
    mockWaSocket = mock<WASocket>()
    mockBaileysEventEmitter = mock<typeof mockWaSocket.ev>()
    Reflect.set(mockWaSocket, 'ev', mockBaileysEventEmitter)
    mockOn = jest.spyOn(mockWaSocket.ev, 'on')
    mockMakeWASocket.mockReturnValue(mockWaSocket)
    onQrCode = jest.fn()
    onStatus = jest.fn()
    onDisconnect = jest.fn()
  })

  test('call connect status connected false', async () => {
    const response = await connect({ phone, onQrCode, onStatus, onDisconnect, store, onNewLogin })
    expect(response.status.connected).toBe(false)
  })

  test('call connect and subscribe 2 events', async () => {
    await connect({ phone, onQrCode, onStatus, onDisconnect, store, onNewLogin })
    expect(mockOn).toBeCalledTimes(2)
  })
})
