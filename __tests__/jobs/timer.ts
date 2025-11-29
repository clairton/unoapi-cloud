import { mock } from 'jest-mock-extended'
jest.mock('../../src/services/redis')
jest.mock('../../src/services/timer')
import { TimerJob } from '../../src/jobs/timer'
import { Incoming } from '../../src/services/incoming'
import { delLastTimer } from '../../src/services/redis'
import { start } from '../../src/services/timer'
const startMock = start as jest.MockedFunction<typeof start>
const delLastTimerMock = delLastTimer as jest.MockedFunction<typeof delLastTimer>

describe('timer', () => {
  let incoming,
    job: TimerJob,
    payload: any,
    phone: string,
    to: string,
    message: string,
    time: number,
    lastTime: number,
    sendSpy: any,
    mockGetLastTimer: any,
    incomingPayload: any

  beforeEach(() => {
    incoming = mock<Incoming>()
    mockGetLastTimer = jest.fn()
    job = new TimerJob(incoming, mockGetLastTimer)
    phone = `${new Date().getTime()}`
    to = `${new Date().getTime()}`
    message = `${new Date().getTime()}s sdfhosfo`
    time = Date.parse('2011-10-05T14:48:00.000Z')
    lastTime = Date.parse('2011-10-05T14:47:00.000Z')
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
    delLastTimerMock.mockResolvedValue(Promise.resolve())
    delLastTimerMock.mockClear()
  })

  test('consumer without last time date', async () => {
    mockGetLastTimer.mockReturnValueOnce(new Promise((resolve) => resolve(undefined)))
    await job.consume(phone, { payload })
    expect(sendSpy).toHaveBeenCalledWith(...incomingPayload)
    expect(delLastTimerMock).toHaveBeenCalled()
  })

  test('consumer with greather last time date', async () => {
    mockGetLastTimer.mockReturnValue(new Promise((resolve) => resolve(Date.parse('2011-10-05T14:48:01.000Z'))))
    await job.consume(phone, { payload })
    expect(sendSpy).not.toHaveBeenCalled()
    expect(delLastTimerMock).toHaveBeenCalled()
  })

  test('consumer with less last time date', async () => {
    mockGetLastTimer.mockReturnValue(new Promise((resolve) => resolve(Date.parse('2011-10-05T14:47:59.000Z'))))
    await job.consume(phone, { payload })
    expect(sendSpy).toHaveBeenCalledWith(...incomingPayload)
    expect(delLastTimerMock).toHaveBeenCalled()
  })

  test('consumer with equals last time date', async () => {
    mockGetLastTimer.mockReturnValue(new Promise((resolve) => resolve(time)))
    await job.consume(phone, { payload })
    expect(sendSpy).not.toHaveBeenCalled()
    expect(delLastTimerMock).toHaveBeenCalled()
  })

  test('consumer with nexts', async () => {
    mockGetLastTimer.mockReturnValue(new Promise((resolve) => resolve(Date.parse('2011-10-05T14:47:00.000Z'))))
    const first = { ...payload }
    const nexts = [first]
    await job.consume(phone, { payload: { ...payload, nexts } })
    expect(startMock).toHaveBeenCalledWith(first.phone, first.to, first.timeout, first.message, 'text', [])
    expect(delLastTimerMock).toHaveBeenCalledTimes(0)
  })
})
