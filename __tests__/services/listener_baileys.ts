import { mock } from 'jest-mock-extended'
import { Store, getStore } from '../../src/services/store'
import { DataStore } from '../../src/services/data_store'
import { MediaStore } from '../../src/services/media_store'
import { Config, getConfig, defaultConfig, getMessageMetadataDefault } from '../../src/services/config'
import { ListenerBaileys } from '../../src/services/listener_baileys'
import { Outgoing } from '../../src/services/outgoing'
import { Broadcast } from '../../src/services/broadcast'
import { v1 as uuid } from 'uuid'
import { DecryptError } from '../../src/services/transformer'

let store: Store
let getConfig: getConfig
let config: Config
let getStore: getStore
let phone: string
let outgoing: Outgoing
let service: ListenerBaileys
let broadcast: Broadcast

const id = uuid().replaceAll('-', '')
const remoteJid = `${uuid()}@s.whatsapp.net`
const key = {
  remoteJid,
  fromMe: false,
  id
}
const message = {
  conversation: 'skdfkdshf',
}
const textPayload = {
  key,
  message
}
const documentMessage = {
  url: '',
  mimetype: 'text/csv',
  title: uuid(),
  caption: 'pode subir essa campanha por favor'
}
const mediaPayload = {
  key,
  message: { 
    documentMessage
  }
}
const messageStubTypePayload = {
  key,
  messageStubType: 2,
  messageStubParameters: ['Invalid PreKey ID'],
}

describe('service listener baileys', () => {
  beforeEach(() => {
    config = defaultConfig
    config.ignoreGroupMessages = true
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    getStore = async (_phone: string): Promise<Store> => store
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    getConfig = async (_phone: string) => {
      config.getStore = getStore
      config.getMessageMetadata = getMessageMetadataDefault
      return config
    }
    store = mock<Store>()
    broadcast = mock<Broadcast>()
    outgoing = mock<Outgoing>()
    store.dataStore = mock<DataStore>()
    store.mediaStore = mock<MediaStore>()
    phone = `${new Date().getMilliseconds()}`
    service = new ListenerBaileys(outgoing, broadcast, getConfig)
  })

  test('send call sendOne when text', async () => {
    const payload = JSON.parse(JSON.stringify(textPayload))
    const func = jest.spyOn(service, 'sendOne')
    await service.process(phone, [payload], 'notify')
    expect(func).toHaveBeenCalledTimes(1)
  })

  test('not change message id when already originalId', async () => {
    const id = uuid().replaceAll('-', '')
    const payload = JSON.parse(JSON.stringify(messageStubTypePayload))
    payload['key']['originalId'] = uuid().replaceAll('-', '')
    payload.key.id = id
    try {
      await service.process(phone, [payload], 'notify')
    } catch (error) {
      expect(payload.key.id).toBe(id)
    }
  })

  test('call dataStore setStatus on decrypt error', async () => {
    const spy = jest.spyOn(store.dataStore, 'setStatus')
    const payload = JSON.parse(JSON.stringify(messageStubTypePayload))
    try {
      await service.process(phone, [payload], 'notify')
    } catch (error) {
      expect(spy).toHaveBeenCalledWith(id, 'decryption_failed')
    }
  })

  test('decrypt error message id with originalId', async () => {
    const payload = JSON.parse(JSON.stringify(messageStubTypePayload))
    try {
      await service.process(phone, [payload], 'notify')
    } catch (error) {
      expect((error as DecryptError).getMessageId()).toBe(id)
    }
  })

  test('call dataStore setStatus decrypted on success', async () => {
    const payload = JSON.parse(JSON.stringify(textPayload))
    const spy = jest.spyOn(store.dataStore, 'setStatus')
    await service.process(phone, [payload], 'notify')
    expect(spy).toHaveBeenCalledWith(id, 'decrypted')
  })

  test('call dataStore setUnoId with id baileys', async () => {
    const payload = JSON.parse(JSON.stringify(textPayload))
    const spy = jest.spyOn(store.dataStore, 'setUnoId')
    await service.process(phone, [payload], 'notify')
    expect(spy).toHaveBeenCalledWith(id, expect.stringContaining('-'))
    expect(spy).toHaveBeenCalledWith(expect.stringContaining('-'), id)
  })

  test('call dataStore setKey', async () => {
    const payload = JSON.parse(JSON.stringify(textPayload))
    const spy = jest.spyOn(store.dataStore, 'setKey')
    await service.process(phone, [payload], 'notify')
    expect(spy).toHaveBeenCalledWith(id, expect.objectContaining({ fromMe: false }))
  })

  test('call dataStore setMessage', async () => {
    const payload = JSON.parse(JSON.stringify(textPayload))
    const spy = jest.spyOn(store.dataStore, 'setMessage')
    await service.process(phone, [payload], 'notify')
    expect(spy).toHaveBeenCalledWith(remoteJid, expect.objectContaining({ message }))
  })

  test('call mediaStore isSaveMedia', async () => {
    const spy = jest.spyOn(store.mediaStore, 'saveMedia').mockResolvedValueOnce(mediaPayload)
    await service.process(phone, [mediaPayload], 'notify')
    expect(spy).toHaveBeenCalledWith(expect.objectContaining({ message: { documentMessage } }))
  })
})
