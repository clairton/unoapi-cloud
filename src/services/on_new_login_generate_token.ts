import { Outgoing } from './outgoing'
import { v1 as uuid } from 'uuid'
import { getConfigRedis } from './config_redis'
import { getConfig, setConfig } from './redis'
import { OnNewLogin } from './socket'
import { t } from '../i18n'

export const onNewLoginGenerateToken = (outgoing: Outgoing): OnNewLogin => {
  return async (phone: string) => {
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
    const message = t('on_read_qrcode', authToken)
    const payload = {
      from: phone,
      type: 'text',
      text: {
        body: message,
      },
    }
    return outgoing.formatAndSend(phone, phone, payload)
  }
}
