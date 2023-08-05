import { Incoming } from './incoming'
import {Client, createConnectionInterface, disconnectClientInterface, getClient} from './client'
import { getConfig } from './config'
import { Outgoing } from './outgoing'
import { OnNewLogin } from './socket'

export class IncomingBaileys implements Incoming {
  private service: Outgoing
  private getClient: getClient
  private getConfig: getConfig
  private onNewLogin: OnNewLogin
  private createConnection: createConnectionInterface
  private disconnectPhone: disconnectClientInterface

  constructor(
    service: Outgoing,
    getConfig: getConfig,
    getClient: getClient,
    onNewLogin: OnNewLogin,
    createConnection: createConnectionInterface,
    disconnectPhone: disconnectClientInterface,
  ) {
    this.service = service
    this.getConfig = getConfig
    this.getClient = getClient
    this.onNewLogin = onNewLogin
    this.createConnection = createConnection
    this.disconnectPhone = disconnectPhone
  }
  public async disconnectClient(phone: string) {
    try {
      const response = await this.disconnectPhone({
        phone,
        incoming: this,
        outgoing: this.service,
        getConfig: this.getConfig,
        onNewLogin: this.onNewLogin,
      })
      return response
    } catch (e) {
      return false
    }
  }
  public async send(phone: string, payload: object, options: object) {
    const client: Client = await this.getClient({
      phone,
      incoming: this,
      outgoing: this.service,
      getConfig: this.getConfig,
      onNewLogin: this.onNewLogin,
    })
    console.debug('Retrieved client baileys %s', phone)
    return client.send(payload, options)
  }

  public async createClient(phone: string) {
    return await this.createConnection({
      phone,
      incoming: this,
      outgoing: this.service,
      getConfig: this.getConfig,
      onNewLogin: this.onNewLogin,
    })
  }
}
