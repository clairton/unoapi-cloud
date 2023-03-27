import { DataStore } from '../../src/services/data_store'
import { getDataStore } from '../../src/services/data_store'
import { proto } from '@adiwajshing/baileys'
import { mock } from 'jest-mock-extended'
import { getMediaStoreFile } from '../../src/services/media_store_file'
import { MediaStore } from '../../src/services/media_store'
const phone = `${new Date().getTime()}`
const remoteJid = `${new Date().getTime()}@s.whatsapp.net`
const messageId = `wa.${new Date().getTime()}`
const url = `http://somehost`
const messageKey = {
  id: messageId,
  remoteJid,
}
const text = `${new Date().getTime()}`
const mimetype = 'text/plain'
const extension = 'txt'
const link = `${text}.${extension}`
const fileName = `${text}.${extension}`
const fileLength = new Date().getTime()
const doc: proto.Message.IDocumentMessage = {
  fileLength,
  url: link,
  mimetype,
  fileName,
}
const m: proto.IMessage = {
  documentMessage: doc,
}
const message: proto.IWebMessageInfo = {
  key: messageKey,
  // caption: text,
  message: m,
}
const dataStore = mock<DataStore>()
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const getTestDataStore: getDataStore = (_phone: string, _config: unknown): DataStore => {
  return dataStore
}

describe('media routes', () => {
  let mediaStore: MediaStore

  beforeEach(() => {
    dataStore.loadKey.mockReturnValue(new Promise((resolve) => resolve(messageKey)))
    dataStore.loadMessage.mockReturnValue(new Promise((resolve) => resolve(message)))
    mediaStore = getMediaStoreFile(phone, {}, getTestDataStore)
  })

  test('getMedia', async () => {
    const response = {
      messaging_product: 'whatsapp',
      url: `${url}/v15.0/download/${phone}/${messageId}.${extension}`,
      // file_name: `${phone}/${messageId}.${extension}`,
      mime_type: mimetype,
      id: `${phone}/${messageId}`,
      sha256: undefined,
      file_size: fileLength,
    }
    expect(await mediaStore.getMedia(url, messageId)).toStrictEqual(response)
  })
})
