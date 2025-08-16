import { mock } from 'jest-mock-extended'
jest.mock('../../src/services/redis')
import { TimerJob } from '../../src/jobs/timer'
import { Incoming } from '../../src/services/incoming'
import { delLastTimer } from '../../src/services/redis'
const delLastTimerMock = delLastTimer as jest.MockedFunction<typeof delLastTimer>

describe('timer', () => {
  let incoming, job, payload, phone, to, message, time, sendSpy, mockGetLastTimer, incomingPayload
  
  beforeEach(() => {
    incoming = mock<Incoming>()
    mockGetLastTimer = jest.fn()
    job = new TimerJob(incoming, mockGetLastTimer)
    phone = new Date().getTime()
    to = new Date().getTime()
    message = `${new Date().getTime()}s sdfhosfo`
    time = '2011-10-05T14:48:00.000Z'
    payload = {
      phone, to, message, time
    }
    sendSpy = jest.spyOn(incoming, 'send')

    incomingPayload =[
      phone,
      {
        messaging_product: 'whatsapp',
        to,
        type: 'text',
        text: {
          body: message
        } 
      },
      {}
    ]
    delLastTimerMock.mockResolvedValue(Promise.resolve())
  })

  test('consumer without expired date', async () => {
    mockGetLastTimer.mockReturnValueOnce(new Promise((resolve) => resolve(undefined)))
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
})
