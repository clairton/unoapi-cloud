import request from 'supertest'

import { App } from '../../src/app'
import { Incoming } from '../../src/services/incoming'
import { DataStore } from '../../src/services/data_store'
import { defaultConfig, getConfig } from '../../src/services/config'
import { mock } from 'jest-mock-extended'
import { writeFileSync, existsSync, mkdirSync } from 'fs'
import { Outgoing } from '../../src/services/outgoing'
import { MediaStore } from '../../src/services/media_store'
import { getStore, Store } from '../../src/services/store'
import { SessionStore } from '../../src/services/session_store'
import { OnNewLogin } from '../../src/services/socket'
import { addToBlacklist } from '../../src/services/blacklist'
const addToBlacklist = mock<addToBlacklist>()

const sessionStore = mock<SessionStore>()

const phone = `${new Date().getTime()}`
const messageId = `wa.${new Date().getTime()}`
const url = `http://somehost`
const mimetype = 'text/plain'
const extension = 'txt'

const dataStore = mock<DataStore>()
const store = mock<Store>()
const mediaStore = mock<MediaStore>()
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const getTestStore: getStore = async (_phone: string, _config: object) => {
  store.dataStore = dataStore
  store.mediaStore = mediaStore
  return store
}
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const getConfigTest: getConfig = async (_phone: string) => {
  defaultConfig.getStore = getTestStore
  return defaultConfig
}

describe('media routes', () => {
  let incoming: Incoming
  let outgoing: Outgoing
  let app: App

  beforeEach(() => {
    incoming = mock<Incoming>()
    outgoing = mock<Outgoing>()
    const onNewLogin = mock<OnNewLogin>()
    app = new App(incoming, outgoing, url, getConfigTest, sessionStore, onNewLogin, addToBlacklist)
  })

  test('index', async () => {
    const mediaData = {
      messaging_product: 'whatsapp',
      url: `${url}/v15.0/download/${phone}/${messageId}.${extension}`,
      // file_name: `${phone}/${messageId}.${extension}`,
      mime_type: mimetype,
      id: `${phone}/${messageId}`,
    }
    mediaStore.getMedia.mockReturnValue(new Promise((resolve) => resolve(mediaData)))
    await request(app.server).get(`/v15.0/${phone}/${messageId}`).expect(200, mediaData)
  })

  test('download', async () => {
    const name = `${phone}/${messageId}.${extension}`
    const fileName = `./data/medias/${name}`
    const parts = fileName.split('/')
    const dir: string = parts.splice(0, parts.length - 1).join('/')
    if (!existsSync(dir)) {
      mkdirSync(dir)
    }
    writeFileSync(fileName, `${new Date().getTime()}`)
    const endpoint = `/v15.0/download/${name}`
    mediaStore.downloadMedia.mockImplementation(async (r) => {
      return r.download(fileName, name)
    })
    const response = await request(app.server)
      .get(endpoint)
      .expect(200)
      .buffer()
      .parse((res: request.Response, callback) => {
        if (res) {
          res.setEncoding('binary')
          let data = ''
          res.on('data', (chunk) => {
            data += chunk
          })
          res.on('end', () => {
            callback(null, Buffer.from(data, 'binary'))
          })
        }
      })
    expect(response.headers['content-disposition']).toEqual(`attachment; filename="${name.split('/')[1]}"`)
    expect(response.headers['content-type']).toContain(mimetype)
  })
})
