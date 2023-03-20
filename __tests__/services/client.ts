import { ConnectionInProgress } from '../../src/services/client'

describe('service client ConnectionInProgress', () => {
  test('return a message', async () => {
    const message = `${new Date().getMilliseconds()}`
    const e: Error = new ConnectionInProgress(message)
    expect(e.message).toBe(message)
  })
})
