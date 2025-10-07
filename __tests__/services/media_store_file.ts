import { DataStore } from '../../src/services/data_store'
import { getDataStore } from '../../src/services/data_store'
import { mock } from 'jest-mock-extended'
import { getMediaStoreFile } from '../../src/services/media_store_file'
import { MediaStore } from '../../src/services/media_store'
import { defaultConfig } from '../../src/services/config'
const phone = `${new Date().getTime()}`
const messageId = `wa.${new Date().getTime()}`
const url = `http://somehost`
const mimetype = 'text/plain'
const extension = 'txt'

const message = {
  messaging_product: 'whatsapp',
  id: `${phone}/${messageId}`,
  mime_type: mimetype,
}
const dataStore = mock<DataStore>()
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const getTestDataStore: getDataStore = async (_phone: string, _config: unknown): Promise<DataStore> => {
  return dataStore
}

describe('media routes', () => {
  let mediaStore: MediaStore

  beforeEach(() => {
    dataStore.loadMediaPayload.mockReturnValue(new Promise((resolve) => resolve(message)))
    mediaStore = getMediaStoreFile(phone, defaultConfig, getTestDataStore)
  })

  test('getMedia', async () => {
    const response = {
      url: `${url}/v15.0/download/${phone}/${messageId}.${extension}`,
      ...message,
    }
    expect(await mediaStore.getMedia(url, messageId)).toStrictEqual(response)
  })
})
