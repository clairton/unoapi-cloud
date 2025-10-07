import { mock } from 'jest-mock-extended'
jest.mock('../../src/amqp')
import { ListenerJob } from '../../src/jobs/listener'
import { Outgoing } from '../../src/services/outgoing'
import { DataStore } from '../../src/services/data_store'
import { Listener } from '../../src/services/listener'
import { amqpPublish } from '../../src/amqp'
import { UNOAPI_EXCHANGE_BRIDGE_NAME, UNOAPI_QUEUE_LISTENER, UNOAPI_SERVER_NAME } from '../../src/defaults'
import { DecryptError } from '../../src/services/transformer'
import { Config } from '../../src/services/config'
const amqpPublishMock = amqpPublish as jest.MockedFunction<typeof amqpPublish>

describe('listener', () => {
  let outgoingVar: Outgoing, listenerVar: Listener, getConfigVar, dataStoreVar: DataStore, job: ListenerJob, phone: string
  const config = { provider: 'baileys', server: UNOAPI_SERVER_NAME }

  beforeEach(() => {
    phone = `${new Date().getTime()}`
    outgoingVar = mock<Outgoing>()
    listenerVar = mock<Listener>()
    dataStoreVar = mock<DataStore>()
    getConfigVar = jest.fn()
    const getStore = async (_phone: string, _config: Config) => {
      return {
        dataStore: dataStoreVar,
      }
    }
    const currentConfig = { ...config, getStore }
    getConfigVar.mockReturnValue(new Promise((resolve) => resolve(currentConfig)))
    job = new ListenerJob(listenerVar, outgoingVar, getConfigVar)
    amqpPublishMock.mockClear()
  })

  test('consume messages type append not splited and reenqueue', async () => {
    const type = 'append'
    const m = {}
    const data = { messages: [m], type }
    amqpPublishMock.mockResolvedValueOnce(Promise.resolve())
    await job.consume(phone, data)
    expect(amqpPublishMock).toHaveBeenCalledWith(
      UNOAPI_EXCHANGE_BRIDGE_NAME,
      `${UNOAPI_QUEUE_LISTENER}.${UNOAPI_SERVER_NAME}`,
      phone,
      { messages: [m], type, splited: true },
      { type: 'direct' },
    )
  })

  test('consume messages type delete not splited and reenqueue', async () => {
    const type = 'delete'
    const m = {}
    const data = { messages: { keys: [m] }, type }
    amqpPublishMock.mockResolvedValueOnce(Promise.resolve())
    await job.consume(phone, data)
    expect(amqpPublishMock).toHaveBeenCalledWith(
      UNOAPI_EXCHANGE_BRIDGE_NAME,
      `${UNOAPI_QUEUE_LISTENER}.${UNOAPI_SERVER_NAME}`,
      phone,
      { messages: { keys: [m] }, type, splited: true },
      { type: 'direct' },
    )
  })

  test('consume messages with success', async () => {
    const type = 'delete'
    const messages = [{}]
    const data = { messages, type, splited: true }
    await job.consume(phone, data)
    expect(listenerVar.process).toHaveBeenCalledWith(phone, messages, type)
  })

  test('consume messages with DecryptError and message status is not decryption_failed', async () => {
    const type = 'append'
    const messages = [{}]
    const data = { messages, type, splited: true }
    const content = {}
    const messageId = `${new Date().getTime()}`
    const loadStatusSpy = jest.spyOn(dataStoreVar, 'loadStatus').mockReturnValue(Promise.resolve(undefined))
    jest.spyOn(listenerVar, 'process').mockRejectedValue(new DecryptError(content, messageId))
    await job.consume(phone, data)
    expect(loadStatusSpy).toHaveBeenCalledWith(messageId)
  })

  test('consume messages with DecryptError and message status is decryption_failed', async () => {
    const type = 'append'
    const messages = [{}]
    const data = { messages, type, splited: true }
    const content = {}
    const messageId = `${new Date().getTime()}`
    jest.spyOn(dataStoreVar, 'loadStatus').mockReturnValue(Promise.resolve('decryption_failed'))
    const sendSpy = jest.spyOn(outgoingVar, 'send').mockReturnValue(Promise.resolve())
    jest.spyOn(listenerVar, 'process').mockRejectedValue(new DecryptError(content, messageId))
    await job.consume(phone, data, { countRetries: 2, maxRetries: 2, priority: 0 })
    expect(sendSpy).toHaveBeenCalledWith(phone, content)
  })
})
