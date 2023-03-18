import { IncomingBaileys } from '../../src/services/incoming_baileys'
import { Incoming } from '../../src/services/incoming'
import { Outgoing } from '../../src/services/outgoing'
import { getClient, Client, ClientConfig, defaultClientConfig } from '../../src/services/client'

class DummyOutgoing implements Outgoing {
  // eslint-disable-next-line @typescript-eslint/no-empty-function, @typescript-eslint/no-unused-vars
  async sendMany(phone: string, messages: object[]) {}
  // eslint-disable-next-line @typescript-eslint/no-empty-function, @typescript-eslint/no-unused-vars
  async sendOne(phone: string, message: object) {}
  // eslint-disable-next-line @typescript-eslint/no-empty-function, @typescript-eslint/no-unused-vars
  async send(phone: string, message: object) {}
}

class DummyClient implements Client {
  phone: string
  config: ClientConfig

  constructor() {
    this.phone = `${new Date().getTime()}`
    this.config = defaultClientConfig
  }

  // eslint-disable-next-line @typescript-eslint/no-empty-function
  async connect(): Promise<void> {}
  // eslint-disable-next-line @typescript-eslint/no-empty-function
  async disconnect(): Promise<void> {}
  // eslint-disable-next-line @typescript-eslint/no-unused-vars, @typescript-eslint/no-empty-function
  async sendStatus(text: string): Promise<void> {}
  // eslint-disable-next-line @typescript-eslint/no-unused-vars, @typescript-eslint/no-explicit-any
  async send(payload: any): Promise<any> {
    return true
  }
  // eslint-disable-next-line @typescript-eslint/no-unused-vars, @typescript-eslint/no-empty-function
  async receive(messages: object[], update: boolean): Promise<void> {}
}

const dummyClient = new DummyClient()

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const getClientDummy: getClient = async (phone: string, outgoing: Outgoing): Promise<Client> => {
  return dummyClient
}

describe('service incoming baileys', () => {
  test('send', async () => {
    const phone = `${new Date().getTime()}`
    const service: Outgoing = new DummyOutgoing()
    const baileys: Incoming = new IncomingBaileys(service, defaultClientConfig, getClientDummy)
    const payload: object = { humm: new Date().getTime() }
    const send = jest.spyOn(dummyClient, 'send')
    await baileys.send(phone, payload)
    expect(send).toHaveBeenCalledTimes(1)
    expect(send).toHaveBeenCalledWith(payload)
  })
})
