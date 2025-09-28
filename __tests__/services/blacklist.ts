jest.mock('../../src/services/redis')
import { isInBlacklistInMemory, addToBlacklistInMemory, cleanBlackList, isInBlacklistInRedis } from '../../src/services/blacklist'
import { redisGet, redisKeys, blacklist } from '../../src/services/redis'

const redisGetMock = redisGet as jest.MockedFunction<typeof redisGet>
const redisKeysMock = redisKeys as jest.MockedFunction<typeof redisKeys>
const blacklistMock = blacklist as jest.MockedFunction<typeof blacklist>

describe('service blacklist webhook', () => {
  test('return false isInBlacklistInMemory', async () => {
    await cleanBlackList()
    expect(await isInBlacklistInMemory('x', 'y', { to: 'w' })).toBe('')
  })

  test('return addToBlacklistInMemory', async () => {
    await cleanBlackList()
    expect(await addToBlacklistInMemory('x', 'y', 'w', 100000)).toBe(true)
    expect(await isInBlacklistInMemory('x', 'y', { to: 'w' })).toBe('w')
  })

  test('return false isInBlacklistInRedis', async () => {
    await cleanBlackList()
    redisKeysMock.mockReturnValue(Promise.resolve(['unoapi-webhook-blacklist:x:y:w']))
    redisGetMock.mockReturnValue(Promise.resolve('1'))
    blacklistMock.mockReturnValue('unoapi-webhook-blacklist:::')
    expect(await isInBlacklistInRedis('x', 'y', { to: 'w' })).toBe('w')
  })
})
