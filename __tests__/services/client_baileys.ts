import { ClientBaileys } from '../../src/services/client_baileys'
jest.mock('../../src/services/socket')
import { Client, ClientConfig, defaultClientConfig } from '../../src/services/client'
import { Response } from '../../src/services/response'
import { Outgoing } from '../../src/services/outgoing'
import { Store } from '../../src/services/store'
import { connect, Status, SendError, sendMessage, readMessages, rejectCall } from '../../src/services/socket'
import { mock, mockFn } from 'jest-mock-extended'
import { BaileysEventEmitter, BaileysEventMap, proto } from '@adiwajshing/baileys'
import { DataStore } from '../../src/services/data_store'
import { Incoming } from '../../src/services/incoming'
import { dataStores } from '../../src/services/data_store'

const mockConnect = connect as jest.MockedFunction<typeof connect>

type Event = BaileysEventEmitter & {
  process(handler: (events: Partial<BaileysEventMap>) => void | Promise<void>): () => void
  buffer(): void
  createBufferedFunction<A extends any[], T_1>(work: (...args: A) => Promise<T_1>): (...args: A) => Promise<T_1>
  flush(force?: boolean | undefined): boolean
  isBuffering(): boolean
}

describe('service client baileys', () => {
  let client: Client
  let phone: string
  let outgoing: Outgoing
  let incoming: Incoming
  let store: Store
  let dataStore: DataStore
  let send
  let read
  let rejectCall

  const config: ClientConfig = defaultClientConfig
  const status: Status = { connected: false, disconnected: true, connecting: false, attempt: 0, reconnecting: false }
  const ev = mock<Event>()

  beforeEach(async () => {
    phone = `${new Date().getMilliseconds()}`
    outgoing = mock<Outgoing>()
    incoming = mock<Incoming>()
    dataStore = mock<DataStore>()
    store = mock<Store>()
    store.dataStore = dataStore
    client = new ClientBaileys(phone, store, incoming, outgoing, config)
    send = mockFn<sendMessage>()
    read = mockFn<readMessages>()
    rejectCall = mockFn<rejectCall>()
    mockConnect.mockResolvedValue({ ev, status, send, read, rejectCall })
  })

  test('call send with unknown status', async () => {
    const status = `${new Date().getMilliseconds()}`
    try {
      await client.send({ status })
      expect(true).toBe(false)
    } catch (e) {
      expect(e.message).toBe(`Unknow message status ${status}`)
    }
  })

  test('call send with read status', async () => {
    const loadKey = jest.spyOn(store?.dataStore, 'loadKey')
    loadKey.mockReturnValue(new Promise((resolve) => resolve({ id: `${new Date().getMilliseconds()}` })))
    await client.connect()
    const response: Response = await client.send({ status: 'read', to: `${new Date().getMilliseconds()}` })
    expect(loadKey).toHaveBeenCalledTimes(1)
    expect(read).toHaveBeenCalledTimes(1)
    expect(response.ok).toStrictEqual({ success: true })
  })

  test('call send with message text success', async () => {
    const anyMessage: Promise<proto.WebMessageInfo> = mock<Promise<proto.WebMessageInfo>>()
    send.mockReturnValue(anyMessage)
    const to = `${new Date().getMilliseconds()}`
    const id = `${new Date().getMilliseconds()}`
    send.mockResolvedValue({ key: { id } })
    const payload = { to, type: 'text', text: { body: `${new Date().getMilliseconds()}` } }
    await client.connect()
    const response: Response = await client.send(payload)
    expect(send).toHaveBeenCalledTimes(1)
    expect(response.ok.messages[0].id).toBe(id)
  })

  test('call send with message type unknown', async () => {
    const type = `${new Date().getMilliseconds()}`
    try {
      await client.connect()
      await client.send({ type })
      expect(true).toBe(false)
    } catch (e) {
      expect(e.message).toBe(`Unknow message type ${type}`)
    }
  })

  test('call send with error', async () => {
    const payload = { to: `${new Date().getMilliseconds()}`, type: 'text', text: { body: `${new Date().getMilliseconds()}` } }
    send = async () => {
      throw new SendError(1, '')
    }
    mockConnect.mockResolvedValue({ ev, status, send, read, rejectCall })
    await client.connect()
    const response = await client.send(payload)
    expect(response.error.entry.length).toBe(1)
  })

  test('call disconnect', async () => {
    await client.disconnect()
    expect(dataStores.size).toBe(0)
  })
})
