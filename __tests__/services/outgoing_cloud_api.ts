import { mock } from 'jest-mock-extended'
jest.mock('../../src/services/blacklist')
jest.mock('node-fetch')
import { OutgoingCloudApi } from '../../src/services/outgoing_cloud_api'
import { Outgoing } from '../../src/services/outgoing'
import { Store, getStore } from '../../src/services/store'
import fetch, { Response } from 'node-fetch'
import { DataStore } from '../../src/services/data_store'
import { MediaStore } from '../../src/services/media_store'
import { Config, getConfig, defaultConfig, getMessageMetadataDefault, Webhook } from '../../src/services/config'
import logger from '../../src/services/logger'
import { isInBlacklistInMemory, addToBlacklistInMemory, isInBlacklist } from '../../src/services/blacklist'

const mockFetch = fetch as jest.MockedFunction<typeof fetch>
const addToBlacklistMock = addToBlacklistInMemory as jest.MockedFunction<typeof addToBlacklistInMemory>
const webhook = mock<Webhook>()

let isInBlacklistMock = jest.fn()
let store: Store
let getConfig: getConfig
let config: Config
let getStore: getStore
const url = 'http://example.com'
let phone: string | undefined
let wa_id: string | undefined
let service: Outgoing

describe('service outgoing whatsapp cloud api', () => {
  let textPayload: any, outgoingPayload: any, updatePayload: any

  beforeEach(() => {
    config = defaultConfig
    config.ignoreGroupMessages = true
    webhook.timeoutMs = 1
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    getStore = async (_phone: string): Promise<Store> => store
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    getConfig = async (_phone: string) => {
      config.getStore = getStore
      config.getMessageMetadata = getMessageMetadataDefault
      return config
    }
    store = mock<Store>()
    store.dataStore = mock<DataStore>()
    store.mediaStore = mock<MediaStore>()
    isInBlacklistMock = jest.fn()
    phone = `${new Date().getTime() / 4}`
    wa_id = `${new Date().getTime() / 2}`
    service = new OutgoingCloudApi(getConfig, isInBlacklistMock, addToBlacklistMock)
    textPayload = {
      text: {
        body: 'test',
      },
      type: 'text',
      to: 'abc',
    }
    outgoingPayload = {
      object: 'whatsapp_business_account',
      entry: [
        {
          changes: [
            {
              value: {
                contacts: [{ wa_id }],
                metadata: { display_phone_number: 'abc' },
                messages: [{ from: 'abc' }],
              },
            },
          ],
        },
      ],
    }
    updatePayload = {
      object: 'whatsapp_business_account',
      entry: [
        {
          changes: [
            {
              value: {
                statuses: [{ status: 'deleted' }],
              },
            },
          ],
        },
      ],
    }
  })

  test('send text with success', async () => {
    const mockUrl = `${url}/${phone}`
    logger.debug(`Mock url ${mockUrl}`)
    mockFetch.mockReset()
    expect(fetch).toHaveBeenCalledTimes(0)
    const response = new Response('ok', { status: 200 })
    response.ok = true
    mockFetch.mockResolvedValue(response)
    await service.send(phone!, textPayload)
    expect(fetch).toHaveBeenCalledTimes(1)
  })

  test('not sendHttp in webhook when is in blacklist', async () => {
    mockFetch.mockReset()
    expect(mockFetch).toHaveBeenCalledTimes(0)
    isInBlacklistMock.mockReturnValueOnce(Promise.resolve('1'))
    await service.sendHttp(phone!, webhook, textPayload, {})
    expect(mockFetch).toHaveBeenCalledTimes(0)
  })

  test('not sendHttp in webhook when is sendGroupMessages false', async () => {
    webhook.sendGroupMessages = false
    outgoingPayload.entry[0].changes[0].value.contacts[0].group_id = 'um@g.us'
    mockFetch.mockReset()
    expect(mockFetch).toHaveBeenCalledTimes(0)
    await service.sendHttp(phone!, webhook, outgoingPayload, {})
    expect(mockFetch).toHaveBeenCalledTimes(0)
  })

  test('not sendHttp in webhook when is sendNewsletterMessages false', async () => {
    webhook.sendNewsletterMessages = false
    outgoingPayload.entry[0].changes[0].value.contacts[0].group_id = 'um@newsletter'
    outgoingPayload
    mockFetch.mockReset()
    expect(mockFetch).toHaveBeenCalledTimes(0)
    await service.sendHttp(phone!, webhook, outgoingPayload, {})
    expect(mockFetch).toHaveBeenCalledTimes(0)
  })

  test('not sendHttp in webhook when is sendOutgoingMessages false', async () => {
    webhook.sendOutgoingMessages = false
    mockFetch.mockReset()
    expect(mockFetch).toHaveBeenCalledTimes(0)
    await service.sendHttp(phone!, webhook, outgoingPayload, {})
    expect(mockFetch).toHaveBeenCalledTimes(0)
  })

  test('not sendHttp in webhook when is sendUpdateMessages false', async () => {
    webhook.sendUpdateMessages = false
    mockFetch.mockReset()
    expect(mockFetch).toHaveBeenCalledTimes(0)
    await service.sendHttp(phone!, webhook, updatePayload, {})
    expect(mockFetch).toHaveBeenCalledTimes(0)
  })

  test('not sendHttp in webhook when is sendIncomingMessages false', async () => {
    webhook.sendIncomingMessages = false
    // outgoingPayload.entry[0].changes[0].value.messages[0].from = phone
    mockFetch.mockReset()
    expect(mockFetch).toHaveBeenCalledTimes(0)
    await service.sendHttp(phone!, webhook, outgoingPayload, {})
    expect(mockFetch).toHaveBeenCalledTimes(0)
  })

  test('add to blacklist where addToBlackListOnOutgoingMessageWithTtl', async () => {
    const ttl = 1
    const w: Partial<Webhook> = {
      id: `${new Date().getTime() / 5}`,
      addToBlackListOnOutgoingMessageWithTtl: ttl,
    }
    mockFetch.mockReset()
    await service.sendHttp(phone!, w as Webhook, outgoingPayload, {})
    expect(addToBlacklistMock).toHaveBeenCalledWith(phone!, w.id, wa_id, ttl)
  })
})
