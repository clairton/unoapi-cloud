import { Outgoing } from './outgoing'
import { v1 as uuid } from 'uuid'
import { getConfigRedis } from './config_redis'
import { getConfig, setConfig } from './redis'

export class OnNewLogin {
  private outgoing: Outgoing

  constructor(outgoing: Outgoing) {
    this.outgoing = outgoing
  }

  public async run(phone: string) {
    let authToken = `${uuid()}${uuid()}`.replaceAll('-', '')
    const config = await getConfig(phone)
    if (!config) {
      const defaultConfig = { ...(await getConfigRedis(phone)), authToken }
      await setConfig(phone, defaultConfig)
    } else {
      if (!config.authToken) {
        config.authToken = authToken
      } else {
        authToken = config.authToken
      }
      await setConfig(phone, { ...config })
    }
    const message = `Awesome, read the qrcode if you not yet. For now you need to update config to use this auth token ${authToken}`
    const payload = {
      type: 'text',
      text: {
        body: message,
      },
    }
    return this.outgoing.formatAndSend(phone, phone, payload)
  }
}
