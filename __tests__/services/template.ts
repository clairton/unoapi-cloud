import { Template } from '../../src/services/template'
import { Config, getConfig } from '../../src/services/config'
import { defaultConfig } from '../../src/services/config'
import { Store, getStore } from '../../src/services/store'
import { mock } from 'jest-mock-extended'
import { DataStore } from '../../src/services/data_store'
import { connect } from 'http2'

describe('template', () => {
  const config = { ...defaultConfig }
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const getConfig: getConfig = async (_phone: string) => config
  const store = mock<Store>()
  store.dataStore = mock<DataStore>()
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const getStore: getStore = async (phone: string, config: Config) => store
  config.getStore = getStore
  const service = new Template(getConfig)
  test('bind', async () => {
    const phone = `${new Date().getTime()}`
    const templateName = 'unoapi-connect'
    const templateConnect = {
      id: 2,
      name: templateName,
      status: 'APPROVED',
      category: 'UTILITY',
      language: 'pt_BR',
      components: [
        {
          text: 'url: {{url}}\nheader: {{header}}\ntoken: {{token}}',
          type: 'BODY',
          parameters: [
            {
              type: 'text',
              text: 'url',
            },
            {
              type: 'text',
              text: 'header',
            },
            {
              type: 'text',
              text: 'token',
            },
          ],
        },
      ],
    }
    store.dataStore.loadTemplates = async () => [templateConnect]
    const url = 'https://chatwoot.odontoexcellence.net/webhooks/whatsapp'
    const header = 'api_access_token'
    const token = 'kbKC5xzfuVcAtgzoVKmVHxGo'
    const parameters = [
      {
        type: 'body',
        parameters: [
          {
            type: 'text',
            text: url,
          },
          {
            type: 'text',
            text: header,
          },
          {
            type: 'text',
            text: token,
          },
        ],
      },
    ]
    expect((await service.bind(phone, templateName, parameters)).text).toBe(`url: ${url}\nheader: ${header}\ntoken: ${token}`)
  })
})
