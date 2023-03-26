jest.mock('@adiwajshing/baileys')
import { connect } from '../../src/services/socket'
import makeWASocket, { WASocket } from '@adiwajshing/baileys'
import { mock } from 'jest-mock-extended'
import { Store } from '../../src/services/store'
const mockMakeWASocket = makeWASocket as jest.MockedFunction<typeof makeWASocket>

// let EvWASocket: BaileysEventEmitter & {
//   process(handler: (events: Partial<BaileysEventMap>) => void | Promise<void>): () => void
//   buffer(): void
//   createBufferedFunction<A extends any[], T_1>(work: (...args: A) => Promise<T_1>): (...args: A) => Promise<T_1>
//   flush(force?: boolean | undefined): boolean
//   isBuffering(): boolean
// }

describe('service socket', () => {
  let number: string
  let store: Store
  let mockWaSocket
  let mockBaileysEventEmitter
  let mockOn
  let onQrCode
  let onStatus
  let onDisconnect

  beforeEach(async () => {
    number = `${new Date().getMilliseconds()}`
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
    const response = await connect({ number, onQrCode, onStatus, onDisconnect, store })
    expect(response.status.connected).toBe(false)
  })

  test('call connect and subscribe 2 events', async () => {
    await connect({ number, onQrCode, onStatus, onDisconnect, store })
    expect(mockOn).toBeCalledTimes(2)
  })
})
