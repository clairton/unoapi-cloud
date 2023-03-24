import { ClientBaileys } from '../../src/services/client_baileys'
jest.mock('../../src/services/socket')
import { Client, ClientConfig, defaultClientConfig } from '../../src/services/client'
import { Outgoing } from '../../src/services/outgoing'
import { Store } from '../../src/services/store'
import { connect, Connection } from '../../src/services/socket'
import { mock } from 'jest-mock-extended'
import { WASocket, proto } from '@adiwajshing/baileys'
import { DataStore } from '../../src/services/data_store'
import { Incoming } from '../../src/services/incoming'
import { dataStores } from '../../src/services/data_store'

const mockConnect = connect as jest.MockedFunction<typeof connect>

describe('service client baileys', () => {
  let client: Client
  let phone: string
  let outgoing: Outgoing
  let incoming: Incoming
  let store: Store
  let dataStore: DataStore
  const config: ClientConfig = defaultClientConfig

  beforeEach(async () => {
    phone = `${new Date().getMilliseconds()}`
    outgoing = mock<Outgoing>()
    incoming = mock<Incoming>()
    dataStore = mock<DataStore>()
    store = mock<Store>()
    store.dataStore = dataStore
    client = new ClientBaileys(phone, store, incoming, outgoing, config)
  })

  test('call send with unknown status', async () => {
    const sock = mock<WASocket>()
    Reflect.set(client, 'sock', sock)
    const status = `${new Date().getMilliseconds()}`
    jest.spyOn(client, 'connect')
    const getJid = jest.spyOn(store?.dataStore, 'getJid')
    getJid.mockReturnValue(new Promise((resolve) => resolve(`${new Date().getMilliseconds()}`)))
    try {
      await client.send({ status })
      expect(true).toBe(false)
    } catch (e) {
      expect(e.message).toBe(`Unknow message status ${status}`)
    }
  })

  test('call send with status', async () => {
    const sock = mock<WASocket>()
    Reflect.set(client, 'sock', sock)
    const loadKey = jest.spyOn(store?.dataStore, 'loadKey')
    loadKey.mockReturnValue(new Promise((resolve) => resolve({ id: `${new Date().getMilliseconds()}` })))
    const readMessages = jest.spyOn(sock, 'readMessages')
    await client.send({ status: 'read' })
    expect(readMessages).toHaveBeenCalledTimes(1)
    expect(loadKey).toHaveBeenCalledTimes(1)
  })

  test('call send with message text success', async () => {
    const sock = mock<WASocket>()
    Reflect.set(client, 'sock', sock)
    const getJid = jest.spyOn(store?.dataStore, 'getJid')
    getJid.mockReturnValue(new Promise((resolve) => resolve(`${new Date().getMilliseconds()}`)))
    const sendMessage = jest.spyOn(sock, 'sendMessage')
    const anyMessage: Promise<proto.WebMessageInfo> = mock<Promise<proto.WebMessageInfo>>()
    sendMessage.mockReturnValue(anyMessage)
    const payload = { to: `${new Date().getMilliseconds()}`, type: 'text', text: { body: `${new Date().getMilliseconds()}` } }
    await client.send(payload)
    expect(sendMessage).toHaveBeenCalledTimes(1)
    expect(getJid).toHaveBeenCalledTimes(1)
  })

  test('call send with message type unknown', async () => {
    const sock = mock<WASocket>()
    Reflect.set(client, 'sock', sock)
    const type = `${new Date().getMilliseconds()}`
    try {
      await client.send({ type })
      expect(true).toBe(false)
    } catch (e) {
      expect(e.message).toBe(`Unknow message type ${type}`)
    }
  })

  test('call send with number not have whatsapp', async () => {
    const sock = mock<WASocket>()
    Reflect.set(client, 'sock', sock)
    const getJid = jest.spyOn(store?.dataStore, 'getJid')
    const sendMessage = jest.spyOn(sock, 'sendMessage')
    const payload = { to: `${new Date().getMilliseconds()}`, type: 'text', text: { body: `${new Date().getMilliseconds()}` } }
    const response = await client.send(payload)
    expect(response.error.entry.length).toBe(1)
    expect(sendMessage).toHaveBeenCalledTimes(0)
    expect(getJid).toHaveBeenCalledTimes(1)
  })

  test('call connect send on send', async () => {
    const sock = mock<WASocket>()
    const connect = jest.spyOn(client, 'connect')
    const connectImpl = async () => {
      Reflect.set(client, 'sock', sock)
    }
    connect.mockImplementationOnce(connectImpl)
    const to = `${new Date().getMilliseconds()}`
    const payload = { to }
    const response = await client.send(payload)
    expect(response.error.entry.length).toBe(1)
  })

  test('call connect', async () => {
    const sock = mock<WASocket>()
    const connection: Connection<WASocket> = { sock }
    mockConnect.mockResolvedValue(connection)
    await client.connect()
    expect(mockConnect).toHaveBeenCalledTimes(1)
    expect(Reflect.get(client, 'sock')).toBe(sock)
  })

  test('call connect', async () => {
    await client.disconnect()
    expect(dataStores.size).toBe(0)
  })
})
