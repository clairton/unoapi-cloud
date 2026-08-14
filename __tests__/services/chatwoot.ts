jest.mock('node-fetch')
import fetch, { Response } from 'node-fetch'
import { syncChatwootInbox, syncChatwootInboxes } from '../../src/services/chatwoot'
import { Config, Webhook, defaultConfig } from '../../src/services/config'

const mockFetch = fetch as jest.MockedFunction<typeof fetch>

describe('service chatwoot', () => {
  let phone: string
  let webhook: Webhook
  let config: Config

  beforeEach(() => {
    mockFetch.mockReset()
    phone = '5511999999999'
    webhook = {
      id: 'chatwoot',
      type: 'chatwoot',
      url: '',
      urlAbsolute: '',
      token: '',
      header: '',
      timeoutMs: 5_000,
      sendNewMessages: false,
      sendUpdateMessages: true,
      sendGroupMessages: true,
      sendOutgoingMessages: true,
      sendNewsletterMessages: false,
      sendIncomingMessages: true,
      sendTranscribeAudio: false,
      addToBlackListOnOutgoingMessageWithTtl: undefined,
      chatwootUrl: 'https://chatwoot.example.com',
      chatwootAccountId: '1',
      chatwootToken: 'chatwoot-token',
      chatwootNameInbox: undefined,
    }
    config = { ...defaultConfig, authToken: 'uno-auth-token' }
  })

  test('does nothing when webhook type is not chatwoot', async () => {
    webhook.type = 'http'
    await syncChatwootInbox(phone, webhook, config)
    expect(mockFetch).toHaveBeenCalledTimes(0)
  })

  test('does nothing when chatwoot config is incomplete', async () => {
    webhook.chatwootAccountId = undefined
    await syncChatwootInbox(phone, webhook, config)
    expect(mockFetch).toHaveBeenCalledTimes(0)
  })

  test('creates inbox when it does not exist', async () => {
    const listResponse = { ok: true, status: 200, json: async () => ({ payload: [] }) } as unknown as Response
    const createResponse = { ok: true, status: 200, json: async () => ({ id: 10 }) } as unknown as Response
    mockFetch.mockResolvedValueOnce(listResponse).mockResolvedValueOnce(createResponse)

    await syncChatwootInbox(phone, webhook, config)

    expect(mockFetch).toHaveBeenCalledTimes(2)
    const [createUrl, createOptions] = mockFetch.mock.calls[1]
    expect(createUrl).toBe('https://chatwoot.example.com/api/v1/accounts/1/inboxes')
    expect(createOptions?.method).toBe('POST')
    const body = JSON.parse(createOptions?.body as string)
    expect(body.channel.provider).toBe('whatsapp_cloud')
    expect(body.channel.phone_number).toBe('+5511999999999')
    expect(body.channel.provider_config).toEqual({
      api_key: 'uno-auth-token',
      phone_number_id: '5511999999999',
      business_account_id: '5511999999999',
    })
  })

  test('updates inbox when it already exists', async () => {
    const listResponse = {
      ok: true,
      status: 200,
      json: async () => ({ payload: [{ id: 42, channel_type: 'Channel::Whatsapp', phone_number: '+5511999999999' }] }),
    } as unknown as Response
    const updateResponse = { ok: true, status: 200, json: async () => ({ id: 42 }) } as unknown as Response
    mockFetch.mockResolvedValueOnce(listResponse).mockResolvedValueOnce(updateResponse)

    await syncChatwootInbox(phone, webhook, config)

    expect(mockFetch).toHaveBeenCalledTimes(2)
    const [updateUrl, updateOptions] = mockFetch.mock.calls[1]
    expect(updateUrl).toBe('https://chatwoot.example.com/api/v1/accounts/1/inboxes/42')
    expect(updateOptions?.method).toBe('PATCH')
    const body = JSON.parse(updateOptions?.body as string)
    expect(body.channel.provider_config).toEqual({
      api_key: 'uno-auth-token',
      phone_number_id: '5511999999999',
      business_account_id: '5511999999999',
    })
  })

  test('syncChatwootInboxes ignores errors and keeps going', async () => {
    config.webhooks = [webhook]
    mockFetch.mockRejectedValueOnce(new Error('boom'))
    await expect(syncChatwootInboxes(phone, config)).resolves.toBeUndefined()
  })
})
