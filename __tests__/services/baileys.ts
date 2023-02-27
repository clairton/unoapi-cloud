import { Baileys } from '../../src/services/baileys'
import { Incoming } from '../../src/services/incoming'
import { Outgoing } from '../../src/services/outgoing'
import { store } from '../../src/services/store'
import { getClient } from '../../src/services/get_client'
import { Client } from '../../src/services/Client'
import { multiFileStore } from '../../src/services/multi_file_store'
jest.mock('../../src/services/Client')
const mockClient = jest.mocked(Client)

class DummyOutgoing implements Outgoing {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async sendMany(_phone: string, _messages: []) {
    return true
  }
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async sendOne(_phone: string, _message: object) {
    return true
  }
}

beforeEach(() => {
  mockClient.mockClear()
})

describe('service baileys', () => {
  test('send', async () => {
    expect(Client).not.toHaveBeenCalled()
    const phone = `${new Date().getTime()}`
    const service: Outgoing = new DummyOutgoing()
    const store: store = multiFileStore
    const baileys: Incoming = new Baileys(store, service)
    const payload: object = { humm: new Date().getTime() }
    await baileys.send(phone, payload)
    expect(Client).toHaveBeenCalledTimes(1)
    const mockClientInstance = mockClient.mock.instances[0]
    const clientSend = mockClientInstance.send as jest.Mock
    expect(clientSend).toHaveBeenCalledTimes(1)
    expect(clientSend).toHaveBeenCalledWith(payload)
  })
})
