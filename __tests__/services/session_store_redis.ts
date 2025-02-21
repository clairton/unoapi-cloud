import { SessionStoreRedis } from '../../src/services/session_store_redis'
import { MAX_CONNECT_RETRY } from '../../src/defaults'

describe('service session store redis', () => {
  test('return a blocked on count and verify', async () => {
    const session = `${new Date().getTime()}`
    const store = new SessionStoreRedis()
    const getConnectCount = store.getConnectCount
    store.getConnectCount = async (phone: string) => {
      if (session == phone) {
        return MAX_CONNECT_RETRY
      }
      return getConnectCount(session)
    } 
    expect(await store.incrementConnectCountAndVerify(session)).toBe(true)
  })
  test('return a unblocked on count and verify', async () => {
    const session = `${new Date().getTime()}`
    const store = new SessionStoreRedis()
    const getConnectCount = store.getConnectCount
    store.getConnectCount = async (phone: string) => {
      if (session == phone) {
        return MAX_CONNECT_RETRY - 2
      }
      return getConnectCount(session)
    } 
    expect(!!await store.incrementConnectCountAndVerify(session)).toBe(false)
  })
})
