import { Contact, ContactResponse } from './contact'
import { Client, getClient } from './client'
import { getConfig } from './config'
import { OnNewLogin } from './socket'
import { Listener } from './listener'
import { Incoming } from './incoming'

export default class ContactBaileys implements Contact {
  private service: Listener
  private getClient: getClient
  private getConfig: getConfig
  private onNewLogin: OnNewLogin
  private incoming: Incoming

  constructor(service: Listener, getConfig: getConfig, getClient: getClient, onNewLogin: OnNewLogin, incoming: Incoming) {
    this.service = service
    this.getConfig = getConfig
    this.getClient = getClient
    this.onNewLogin = onNewLogin
    this.incoming = incoming
  }

  public async verify(phone: string, numbers: string[]) {
    const client: Client = await this.getClient({
      phone,
      incoming: this.incoming,
      listener: this.service,
      getConfig: this.getConfig,
      onNewLogin: this.onNewLogin,
    })
    const contacts = await client.contacts(numbers)
    return { contacts }
  }
}