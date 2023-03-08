import { IncomingBaileys } from '../../src/services/incoming_baileys'
import { Incoming } from '../../src/services/incoming'
import { Outgoing } from '../../src/services/outgoing'
import { store } from '../../src/services/store'
import { ClientBaileys } from '../../src/services/client_baileys'
import { storeFile } from '../../src/services/store_file'
jest.mock('../../src/services/client_baileys')
const mockClient = jest.mocked(ClientBaileys)

class DummyOutgoing implements Outgoing {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars, @typescript-eslint/no-empty-function
  async sendMany(_phone: string, _messages: []) {}
  // eslint-disable-next-line @typescript-eslint/no-unused-vars, @typescript-eslint/no-empty-function
  async sendOne(_phone: string, _message: object) {}
}

beforeEach(() => {
  mockClient.mockClear()
})

describe('service incoming baileys', () => {
  test('send', async () => {
    expect(ClientBaileys).not.toHaveBeenCalled()
    const phone = `${new Date().getTime()}`
    const service: Outgoing = new DummyOutgoing()
    const store: store = storeFile
    const baileys: Incoming = new IncomingBaileys(store, service)
    const payload: object = { humm: new Date().getTime() }
    await baileys.send(phone, payload)
    expect(ClientBaileys).toHaveBeenCalledTimes(1)
    const mockClientInstance = mockClient.mock.instances[0]
    const clientSend = mockClientInstance.send as jest.Mock
    expect(clientSend).toHaveBeenCalledTimes(1)
    expect(clientSend).toHaveBeenCalledWith(payload)
  })
})
