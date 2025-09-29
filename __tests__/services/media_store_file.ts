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
    dataStore.loadMediaPayload.mockReset()
    mediaStore = getMediaStoreFile(phone, defaultConfig, getTestDataStore)
  })

  test('getMedia', async () => {
    dataStore.loadMediaPayload.mockResolvedValueOnce(message)
    const response = {
      url: `${url}/v15.0/download/${phone}/${messageId}.${extension}`,
      ...message,
    }
    expect(await mediaStore.getMedia(url, messageId)).toStrictEqual(response)
  })

  test('getMedia without mime type', async () => {
    const payload = {
      messaging_product: 'whatsapp',
      id: `${phone}/${messageId}`,
      filename: `${messageId}.${extension}`,
    }
    dataStore.loadMediaPayload.mockResolvedValueOnce(payload)
    const response = {
      url: `${url}/v15.0/download/${phone}/${messageId}.${extension}`,
      ...payload,
      mime_type: mimetype,
    }
    expect(await mediaStore.getMedia(url, messageId)).toStrictEqual(response)
  })

  test('getMedia not found', async () => {
    dataStore.loadMediaPayload.mockResolvedValueOnce(undefined)
    expect(await mediaStore.getMedia(url, messageId)).toBeUndefined()
  })
})
