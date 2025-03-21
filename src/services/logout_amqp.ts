import { amqpPublish } from '../amqp'
import { UNOAPI_EXCHANGE_BRIDGE_NAME, UNOAPI_QUEUE_LOGOUT } from '../defaults'
import { getConfig } from './config'
import { Logout } from './logout'

export class LogoutAmqp implements Logout {
  private getConfig: getConfig

  constructor(getConfig: getConfig) {
    this.getConfig = getConfig
  }

    public async run(phone: string) {
    const config = await this.getConfig(phone)
    await amqpPublish(UNOAPI_EXCHANGE_BRIDGE_NAME, UNOAPI_QUEUE_LOGOUT, config.server!, { phone }, { type: 'direct' })
  }
}
