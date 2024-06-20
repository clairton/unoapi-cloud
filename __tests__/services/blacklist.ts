
jest.mock('../../src/services/redis')
import { extractDestinyPhone, isInBlacklistInMemory, addToBlacklistInMemory, cleanBlackList, isInBlacklistInRedis } from '../../src/services/blacklist'
import { redisGet, redisKeys, blacklist } from '../../src/services/redis'

const redisGetMock = redisGet as jest.MockedFunction<typeof redisGet>
const redisKeysMock = redisKeys as jest.MockedFunction<typeof redisKeys>
const blacklistMock = blacklist as jest.MockedFunction<typeof blacklist>

describe('service blacklist webhook', () => {
  test('return y extractDestinyPhone from webhook payload message', async () => {
    const payload = {
      entry: [
        {
          changes: [
            {
              value: {
                contacts: [{ wa_id: 'y' }],
              },
            },
          ],
        },
      ],
    }
    expect(extractDestinyPhone(payload)).toBe('y')
  })

  test('return x extractDestinyPhone from webhook payload status', async () => {
    const payload = {
      entry: [
        {
          changes: [
            {
              value: {
                statuses: [{ recipient_id: 'x' }]
              }
            }
          ]
        }
      ]
    }
    expect(extractDestinyPhone(payload)).toBe('x')
  })

  test('return empty extractDestinyPhone from api payload', async () => {
    expect(extractDestinyPhone({ to: 'y' })).toBe('y')
  })

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
