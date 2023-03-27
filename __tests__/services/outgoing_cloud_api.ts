import { mock } from 'jest-mock-extended'
jest.mock('node-fetch')
import { OutgoingCloudApi } from '../../src/services/outgoing_cloud_api'
import { Outgoing } from '../../src/services/outgoing'
import { MessageFilter } from '../../src/services/message_filter'
import { Store, getStore } from '../../src/services/store'
import fetch, { Response } from 'node-fetch'
import { DataStore } from '../../src/services/data_store'
import { GroupMetadata } from '@adiwajshing/baileys'
import { MediaStore } from '../../src/services/media_store'

const mockFetch = fetch as jest.MockedFunction<typeof fetch>

const filter: MessageFilter = new MessageFilter()
let store: Store
let getStore: getStore
const url = 'http://example.com'
let token, phone
let service: Outgoing

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
const mediaPayload = {
  key: {
    remoteJid: 'askjhasd@kslkjasd.xom',
    fromMe: false,
    id: 'kasjhdkjhasjkshad',
  },
  message: {
    imageMessage: {
      mimetype: 'application/pdf',
    },
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
    token = `${new Date().getMinutes()}`
    store = mock<Store>()
    store.dataStore = mock<DataStore>()
    store.mediaStore = mock<MediaStore>()
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    getStore = async (_phone: string): Promise<Store> => store
    phone = `${new Date().getMilliseconds()}`
    service = new OutgoingCloudApi(filter, { ignoreGroupMessages: true }, getStore, url, token)
  })

  test('send text with success', async () => {
    const mockUrl = `${url}/${phone}`
    console.debug(`Mock url ${mockUrl}`)
    expect(fetch).toHaveBeenCalledTimes(0)
    const response = new Response('ok', { status: 200 })
    response.ok = true
    mockFetch.mockResolvedValue(response)
    await service.send(phone, textPayload)
    expect(fetch).toHaveBeenCalledTimes(1)
  })

  test('sendMany call sendOne when text', async () => {
    const func = jest.spyOn(service, 'sendOne')
    await service.sendMany(phone, [textPayload])
    expect(func).toHaveBeenCalledTimes(1)
  })

  test('sendOne with media', async () => {
    const saveMedia = jest.spyOn(store.mediaStore, 'saveMedia')
    const send = jest.spyOn(service, 'send')
    send.mockResolvedValue()
    saveMedia.mockResolvedValue()
    await service.sendOne(phone, mediaPayload)
    expect(saveMedia).toHaveBeenCalledTimes(1)
    expect(send).toHaveBeenCalledTimes(1)
  })

  test('sendOne with group', async () => {
    service = new OutgoingCloudApi(filter, { ignoreGroupMessages: false }, getStore, url, token)
    const fetchGroupMetadata = jest.spyOn(store.dataStore, 'fetchGroupMetadata')
    fetchGroupMetadata.mockResolvedValue(mock<GroupMetadata>())
    await service.sendOne(phone, groupPayload)
    expect(fetchGroupMetadata).toHaveBeenCalledTimes(1)
  })
})
