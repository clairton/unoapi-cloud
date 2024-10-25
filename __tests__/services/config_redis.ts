jest.mock('../../src/services/redis')
import { getConfig } from '../../src/services/redis'
import { getConfigRedis } from '../../src/services/config_redis'
import { configs } from '../../src/services/config'
import { WEBHOOK_HEADER } from '../../src/defaults'
const mockGetConfig = getConfig as jest.MockedFunction<typeof getConfig>

describe('service config redis', () => {
  beforeEach(() => {
    configs.clear()
  })

  test('use redis', async () => {
    const ignoreGroupMessages = false
    mockGetConfig.mockResolvedValue({ ignoreGroupMessages })
    const config = await getConfigRedis(`${new Date().getTime()}`)
    expect(config.ignoreGroupMessages).toBe(ignoreGroupMessages)
  })

  test('use default', async () => {
    mockGetConfig.mockResolvedValue({})
    const config = await getConfigRedis(`${new Date().getTime()}`)
    expect(config.ignoreGroupMessages).toBe(true)
    expect(config.ignoreBroadcastMessages).toBe(false)
  })

  // test('use env', async () => {
  //   console.log('>>>>>>>>>>', JSON.stringify(process.env.IGNORE_GROUP_MESSAGES))
  //   const copy = process.env.IGNORE_GROUP_MESSAGES
  //   process.env['IGNORE_GROUP_MESSAGES'] = 'false'
  //   mockGetConfig.mockResolvedValue({})
  //   const config = await getConfigRedis(`${new Date().getTime()}`)
  //   process.env.IGNORE_GROUP_MESSAGES = copy
  //   expect(config.ignoreGroupMessages).toBe(false)
  // })

  test('use webhook url redis', async () => {
    const url = `${new Date().getTime()}${new Date().getTime()}`
    mockGetConfig.mockResolvedValue({ webhooks: [{ url }] })
    const config = await getConfigRedis(`${new Date().getTime()}`)
    expect(config.webhooks[0].url).toBe(url)
  })

  test('use webhook header redis with value in env too', async () => {
    const headerEnv = `${new Date().getTime()}-env`
    const copy = process.env.WEBHOOK_HEADER
    process.env.WEBHOOK_HEADER = headerEnv
    const headerRedis = `${new Date().getTime()}-redis`
    mockGetConfig.mockResolvedValue({ webhooks: [{ url: 'http....', header: headerRedis }] })
    const config = await getConfigRedis(`${new Date().getTime()}`)
    process.env.WEBHOOK_HEADER = copy
    expect(config.webhooks[0].header).toBe(headerRedis)
  })

  test('use webhook header env where not in readis', async () => {
    mockGetConfig.mockResolvedValue({ webhooks: [{}] })
    const config = await getConfigRedis(`${new Date().getTime()}`)
    expect(config.webhooks[0].header).toBe(WEBHOOK_HEADER)
  })
})
