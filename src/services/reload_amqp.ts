import { amqpPublish } from '../amqp'
import { UNOAPI_EXCHANGE_BRIDGE_NAME, UNOAPI_EXCHANGE_BROKER_NAME, UNOAPI_QUEUE_RELOAD } from '../defaults'
import { getConfig } from './config'
import { Reload } from './reload'

export class ReloadAmqp extends Reload {
  private getConfig: getConfig

  constructor(getConfig: getConfig) {
    super()
    this.getConfig = getConfig
  }

  public async run(phone: string, params = { force: false }) {
    const config = await this.getConfig(phone)
    await amqpPublish(
      UNOAPI_EXCHANGE_BROKER_NAME,
      UNOAPI_QUEUE_RELOAD,
      phone,
      { phone, ...params },
      { type: 'topic' }
    )
    await amqpPublish(
      UNOAPI_EXCHANGE_BRIDGE_NAME,
      `${UNOAPI_QUEUE_RELOAD}.${config.server!}`,
      phone,
      { phone, ...params },
      { type: 'direct' }
    )
  }
}
