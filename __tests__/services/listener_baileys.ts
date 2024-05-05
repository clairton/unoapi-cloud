import { mock } from 'jest-mock-extended'
import { Store, getStore } from '../../src/services/store'
import { DataStore } from '../../src/services/data_store'
import { MediaStore } from '../../src/services/media_store'
import { Config, getConfig, defaultConfig, getMessageMetadataDefault } from '../../src/services/config'
import { ListenerBaileys } from '../../src/services/listener_baileys'
import { Outgoing } from '../../src/services/outgoing'

let store: Store
let getConfig: getConfig
let config: Config
let getStore: getStore
let phone
let outgoing: Outgoing
let service: ListenerBaileys

const textPayload = {
  key: {
    remoteJid: 'askjhasd@kslkjasd.xom',
    fromMe: false,
    id: 'kasjhdkjhasjkshad',
  },
  message: {
    conversation: 'skdfkdshf',
  },
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
    outgoing = mock<Outgoing>()
    store.dataStore = mock<DataStore>()
    store.mediaStore = mock<MediaStore>()
    phone = `${new Date().getMilliseconds()}`
    service = new ListenerBaileys(outgoing, getConfig)
  })

  test('send call sendOne when text', async () => {
    const func = jest.spyOn(service, 'sendOne')
    await service.process(phone, [textPayload], 'notify')
    expect(func).toHaveBeenCalledTimes(1)
  })
})
