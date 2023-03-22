import { ClientBaileys } from '../../src/services/client_baileys'
import { Client, ClientConfig, defaultClientConfig } from '../../src/services/client'
import { Outgoing } from '../../src/services/outgoing'
import { Store } from '../../src/services/store'
import { mock } from 'jest-mock-extended'
import { WASocket, proto } from '@adiwajshing/baileys'
import { DataStore } from '../../src/services/data_store'

describe('service client baileys', () => {
  let client: Client
  let phone: string
  let outgoing: Outgoing
  let store: Store
  let dataStore: DataStore
  const config: ClientConfig = defaultClientConfig

  beforeEach(async () => {
    phone = `${new Date().getMilliseconds()}`
    outgoing = mock<Outgoing>()
    dataStore = mock<DataStore>()
    store = mock<Store>()
    store.dataStore = dataStore
    client = new ClientBaileys(phone, store, outgoing, config)
  })

  test('call sendStatus important', async () => {
    const send = jest.spyOn(outgoing, 'sendOne')
    client.sendStatus(`${new Date().getMilliseconds()}`, false)
    expect(send).toHaveBeenCalledTimes(1)
  })

  test('call sendStatus important', async () => {
    const send = jest.spyOn(outgoing, 'sendOne')
    client.sendStatus(`${new Date().getMilliseconds()}`, true)
    expect(send).toHaveBeenCalledTimes(1)
  })

  test('call receive', async () => {
    const send = jest.spyOn(outgoing, 'sendMany')
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const messages: any[] = []
    await client.receive(messages, false)
    expect(send).toHaveBeenCalledTimes(1)
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
})
