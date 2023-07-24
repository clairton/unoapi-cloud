import { ClientBaileys } from '../../src/services/client_baileys'
jest.mock('../../src/services/socket')
import { Client } from '../../src/services/client'
import { Config, getConfig, defaultConfig } from '../../src/services/config'
import { Response } from '../../src/services/response'
import { Outgoing } from '../../src/services/outgoing'
import { Store } from '../../src/services/store'
import { connect, Status, SendError, sendMessage, readMessages, rejectCall } from '../../src/services/socket'
import { mock, mockFn } from 'jest-mock-extended'
import { proto } from '@whiskeysockets/baileys'
import { DataStore } from '../../src/services/data_store'
import { Incoming } from '../../src/services/incoming'
import { dataStores } from '../../src/services/data_store'
import logger from '../../src/services/logger'

const mockConnect = connect as jest.MockedFunction<typeof connect>

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const event = (event, _callback) => {
  logger.info('subscribe event: ', event)
}

const onNewLogin = async (phone: string) => {
  logger.info('New login', phone)
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
  let getConfig: getConfig
  let config: Config

  const status: Status = { connected: false, disconnected: true, connecting: false, attempt: 0, reconnecting: false }

  beforeEach(async () => {
    phone = `${new Date().getMilliseconds()}`
    outgoing = mock<Outgoing>()
    incoming = mock<Incoming>()
    dataStore = mock<DataStore>()
    store = mock<Store>()
    store.dataStore = dataStore
    config = defaultConfig
    config.ignoreGroupMessages = true
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    getConfig = async (_phone: string) => {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      config.getStore = async (_phone: string) => {
        return store
      }
      return config
    }
    client = new ClientBaileys(phone, incoming, outgoing, getConfig, onNewLogin)
    send = mockFn<sendMessage>()
    read = mockFn<readMessages>()
    rejectCall = mockFn<rejectCall>()
    mockConnect.mockResolvedValue({ event, status, send, read, rejectCall })
  })

  test('call send with unknown status', async () => {
    const status = `${new Date().getMilliseconds()}`
    try {
      await client.send({ status }, {})
      expect(true).toBe(false)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (e: any) {
      expect(e.message).toBe(`Unknow message status ${status}`)
    }
  })

  test('call send with read status', async () => {
    const loadKey = jest.spyOn(store?.dataStore, 'loadKey')
    loadKey.mockReturnValue(new Promise((resolve) => resolve({ id: `${new Date().getMilliseconds()}` })))
    await client.connect()
    const response: Response = await client.send({ status: 'read', to: `${new Date().getMilliseconds()}` }, {})
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
    const response: Response = await client.send(payload, {})
    expect(send).toHaveBeenCalledTimes(1)
    expect(response.ok.messages[0].id).toBe(id)
  })

  test('call send with message type unknown', async () => {
    const type = `${new Date().getMilliseconds()}`
    try {
      await client.connect()
      await client.send({ type }, {})
      expect(true).toBe(false)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (e: any) {
      expect(e.message).toBe(`Unknow message type ${type}`)
    }
  })

  test('call send with error', async () => {
    const payload = { to: `${new Date().getMilliseconds()}`, type: 'text', text: { body: `${new Date().getMilliseconds()}` } }
    send = async () => {
      throw new SendError(1, '')
    }
    mockConnect.mockResolvedValue({ event, status, send, read, rejectCall })
    await client.connect()
    const response = await client.send(payload, {})
    expect(response.error.entry.length).toBe(1)
  })

  test('call disconnect', async () => {
    await client.disconnect()
    expect(dataStores.size).toBe(0)
  })
})
