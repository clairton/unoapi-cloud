import { IncomingBaileys } from '../../src/services/incoming_baileys'
import { Incoming } from '../../src/services/incoming'
import { Listener } from '../../src/services/listener'
import { getClient, Client, Contact } from '../../src/services/client'
import { Config, defaultConfig, getConfig, getConfigDefault } from '../../src/services/config'
import { mock } from 'jest-mock-extended'
import logger from '../../src/services/logger'

class DummyClient implements Client {
  phone: string
  config: Config

  constructor() {
    this.phone = `${new Date().getTime()}`
    this.config = defaultConfig
  }

  // eslint-disable-next-line @typescript-eslint/no-empty-function
  async connect(): Promise<void> {}
  // eslint-disable-next-line @typescript-eslint/no-empty-function
  async disconnect(): Promise<void> {}
  // eslint-disable-next-line @typescript-eslint/no-empty-function
  async logout(): Promise<void> {}
  // eslint-disable-next-line @typescript-eslint/no-unused-vars, @typescript-eslint/no-explicit-any
  async send(payload: any): Promise<any> {
    return true
  }
  async getMessageMetadata<T>(data: T) {
    return data
  }

  public async contacts(_numbers: string[]) {
    const contacts: Contact[] = []
    return contacts
  }
}

const dummyClient = new DummyClient()

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const getClientDummy: getClient = async ({
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  phone,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  incoming,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  listener,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  getConfig,
}: {
  phone: string
  incoming: Incoming
  listener: Listener
  getConfig: getConfig
}): Promise<Client> => {
  return dummyClient
}

const onNewLogin = async (phone: string) => {
  logger.info('New login %s', phone)
}

describe('service incoming baileys', () => {
  test('send', async () => {
    const phone = `${new Date().getTime()}`
    const service: Listener = mock<Listener>()
    const baileys: Incoming = new IncomingBaileys(service, getConfigDefault, getClientDummy, onNewLogin)
    const payload: object = { humm: new Date().getTime() }
    const send = jest.spyOn(dummyClient, 'send')
    await baileys.send(phone, payload, {})
    expect(send).toHaveBeenCalledTimes(1)
    expect(send).toHaveBeenCalledWith(payload, {})
  })
})
