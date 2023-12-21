import { mock } from 'jest-mock-extended'
jest.mock('node-fetch')
import { Store, getStore } from '../../src/services/store'
import { DataStore } from '../../src/services/data_store'
import { MediaStore } from '../../src/services/media_store'
import { getConfig, getConfigDefault } from '../../src/services/config'

let store: Store
const getConfig: getConfig = getConfigDefault
let getStore: getStore
let phone: string

const individualPayload = {
  key: {
    remoteJid: 'askjhasd@kslkjasd.xom',
    fromMe: false,
    id: 'kasjhdkjhasjkshad',
  },
  message: {
    conversation: 'skdfkdshf',
  },
}

const groupPayload = {
  key: {
    remoteJid: 'askjhasd@g.us',
    fromMe: false,
    id: 'kasjhdkjhasjkshad',
  },
  message: {
    conversation: 'skdfkdshf',
  },
}

describe('config', () => {
  beforeEach(() => {
    store = mock<Store>()
    store.dataStore = mock<DataStore>()
    store.mediaStore = mock<MediaStore>()
    phone = `${new Date().getTime()}`
  })

  test('getMessageMetada Indifidual', async () => {
    expect(await (await getConfig(phone)).getMessageMetadata(individualPayload)).toBe(individualPayload)
  })

  test('getMessageMetada Group', async () => {
    expect(await (await getConfig(phone)).getMessageMetadata(groupPayload)).toBe(groupPayload)
  })
})
