import { mock } from 'jest-mock-extended'
jest.mock('../../src/services/redis')
jest.mock('../../src/services/timer')
import { TimerJob } from '../../src/jobs/timer'
import { Incoming } from '../../src/services/incoming'
import { start } from '../../src/services/timer'
import { getConfig } from '../../src/services/redis'
import { dataStores } from '../../src/services/data_store'
const startMock = start as jest.MockedFunction<typeof start>

describe('timer', () => {
  let incoming,
    job: TimerJob,
    payload: any,
    phone: string,
    to: string,
    message: string,
    time: string,
    sendSpy: any,
    mockGetLastTimer: any,
    incomingPayload: any,
    messageDirection: string | undefined,
    getConfigVar: typeof getConfig

  beforeEach(() => {
    incoming = mock<Incoming>()
    mockGetLastTimer = jest.fn()
    messageDirection = 'incoming'
    getConfigVar = async () => {
      return {
          getStore: async () => {
            return {
              dataStore: {
                loadLastMessageDirection: async () => messageDirection
              }
            }
          }
      }
    }
    job = new TimerJob(incoming, getConfigVar, mockGetLastTimer)
    phone = `${new Date().getTime()}`
    to = `${new Date().getTime()}`
    message = `${new Date().getTime()}s sdfhosfo`
    time = '2011-10-05T14:48:00.000Z'
    payload = {
      phone,
      to,
      message,
      time,
    }
    sendSpy = jest.spyOn(incoming, 'send')

    incomingPayload = [
      phone,
      {
        messaging_product: 'whatsapp',
        to,
        type: 'text',
        text: {
          body: message,
        },
      },
      {},
    ]
  })

  test('consumer without expired date', async () => {
    mockGetLastTimer.mockReturnValueOnce(new Promise((resolve) => resolve(undefined)))
    await job.consume(phone, { payload })
    expect(sendSpy).not.toHaveBeenCalled()
  })

  test('consumer with last message direction undefined', async () => {
    messageDirection = undefined
    await job.consume(phone, { payload })
    expect(sendSpy).not.toHaveBeenCalled()
  })

  test('consumer with last message direction outgoing', async () => {
    messageDirection = 'outgoing'
    await job.consume(phone, { payload })
    expect(sendSpy).not.toHaveBeenCalled()
  })

  test('consumer with greather expired date', async () => {
    mockGetLastTimer.mockReturnValue(new Promise((resolve) => resolve('2011-10-05T14:48:01.000Z')))
    await job.consume(phone, { payload })
    expect(sendSpy).not.toHaveBeenCalled()
  })

  test('consumer with less expired date', async () => {
    mockGetLastTimer.mockReturnValue(new Promise((resolve) => resolve('2011-10-05T14:47:59.000Z')))
    await job.consume(phone, { payload })
    expect(sendSpy).toHaveBeenCalledWith(...incomingPayload)
  })

  test('consumer with equals expired date', async () => {
    mockGetLastTimer.mockReturnValue(new Promise((resolve) => resolve(time)))
    await job.consume(phone, { payload })
    expect(sendSpy).toHaveBeenCalledWith(...incomingPayload)
  })

  test('consumer with equals expired date', async () => {
    mockGetLastTimer.mockReturnValue(new Promise((resolve) => resolve(time)))
    await job.consume(phone, { payload })
    expect(sendSpy).toHaveBeenCalledWith(...incomingPayload)
  })

  test('consumer with nexts', async () => {
    mockGetLastTimer.mockReturnValue(new Promise((resolve) => resolve(time)))
    const first = { ...payload }
    const nexts = [first]
    await job.consume(phone, { payload: { ...payload, nexts } })
    expect(startMock).toHaveBeenCalledWith(first.phone, first.to, first.timeout, first.message, 'text', [])
  })
})
