jest.mock('@adiwajshing/baileys')
import { connect, Connection } from '../../src/services/socket'
import makeWASocket, { WASocket } from '@adiwajshing/baileys'
import { Client, ClientConfig, defaultClientConfig } from '../../src/services/client'
import { mock } from 'jest-mock-extended'
import { Outgoing } from '../../src/services/outgoing'
import { Store } from '../../src/services/store'
import { Incoming } from '../../src/services/incoming'
const mockMakeWASocket = makeWASocket as jest.MockedFunction<typeof makeWASocket>

// let EvWASocket: BaileysEventEmitter & {
//   process(handler: (events: Partial<BaileysEventMap>) => void | Promise<void>): () => void
//   buffer(): void
//   createBufferedFunction<A extends any[], T_1>(work: (...args: A) => Promise<T_1>): (...args: A) => Promise<T_1>
//   flush(force?: boolean | undefined): boolean
//   isBuffering(): boolean
// }

describe('service socket', () => {
  let client: Client
  let phone: string
  let outgoing: Outgoing
  let incoming: Incoming
  let store: Store
  let config: ClientConfig
  let mockWaSocket
  let mockBaileysEventEmitter
  let mockOn

  beforeEach(async () => {
    phone = `${new Date().getMilliseconds()}`
    outgoing = mock<Outgoing>()
    incoming = mock<Incoming>()
    store = mock<Store>()
    client = mock<Client>()
    config = defaultClientConfig
    mockWaSocket = mock<WASocket>()
    mockBaileysEventEmitter = mock<typeof mockWaSocket.ev>()
    Reflect.set(mockWaSocket, 'ev', mockBaileysEventEmitter)
    mockOn = jest.spyOn(mockWaSocket.ev, 'on')
    mockMakeWASocket.mockReturnValue(mockWaSocket)
  })

  test('call connect return sock', async () => {
    const connection: Connection<WASocket> = await connect({ phone, incoming, outgoing, client, store, config })
    expect(connection.sock).toBe(mockWaSocket)
  })

  test('call connect call on 6 times', async () => {
    await connect({ phone, incoming, outgoing, client, store, config })
    expect(mockOn).toBeCalledTimes(6)
  })

  test('call connect call on 7 times when rejectCalls', async () => {
    config.rejectCalls = `${new Date().getMinutes()}`
    await connect({ phone, incoming, outgoing, client, store, config })
    expect(mockOn).toBeCalledTimes(7)
  })
})
