import { mock } from 'jest-mock-extended'
jest.mock('node-fetch')
import { Store, getStore } from '../../src/services/store'
import { DataStore } from '../../src/services/data_store'
import { GroupMetadata } from '@adiwajshing/baileys'
import { MediaStore } from '../../src/services/media_store'
import { getConfig, getGroupMetadata, GetGroupMetadata } from '../../src/services/config'

let store: Store
let getConfig: getConfig
let getStore: getStore

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

describe('service incoming baileys', () => {
  beforeEach(() => {
    store = mock<Store>()
    store.dataStore = mock<DataStore>()
    store.mediaStore = mock<MediaStore>()
  })

  test('call store fetchGroupMetadata when is group message', async () => {
    const get: GetGroupMetadata = getGroupMetadata
    const fetchGroupMetadata = jest.spyOn(store.dataStore, 'fetchGroupMetadata')
    fetchGroupMetadata.mockResolvedValue(mock<GroupMetadata>())
    await get(groupPayload, store)
    expect(fetchGroupMetadata).toHaveBeenCalledTimes(1)
  })

  test('not call store fetchGroupMetadata when is individual message', async () => {
    const get: GetGroupMetadata = getGroupMetadata
    await get(individualPayload, store)
  })
})
