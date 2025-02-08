import { SessionStore, sessionStatus } from './session_store'
import { configKey, redisKeys, getSessionStatus, setSessionStatus, sessionStatusKey, redisGet, getConfig, getConnectCount, setConnectCount } from './redis'
import logger from './logger'
import { MAX_CONNECT_RETRY } from '../defaults'

const toReplaceConfig = configKey('')
const toReplaceStatus = sessionStatusKey('')

export class SessionStoreRedis extends SessionStore {
  async getPhones(): Promise<string[]> {
    try {
      const pattern = configKey('*')
      const keys = await redisKeys(pattern)
      return keys.map((key: string) => key.replace(toReplaceConfig, ''))
    } catch (error) {
      logger.error(error, 'Erro on get configs')
      throw error
    }
  }

  async getStatus(phone: string) {
    return await getSessionStatus(phone) || 'disconnected'
  }

  async setStatus(phone: string, status: sessionStatus) {
    logger.info(`Session status ${phone} change from ${await this.getStatus(phone)} to ${status}`)
    return setSessionStatus(phone, status)
  }

  async getConnectCount(phone: string) {
    return getConnectCount(phone)
  }

  async incrementConnectCountAndVerify(phone: string) {
    const count = await this.getConnectCount(phone)
    await setConnectCount(phone, count + 1)

    if (await this.getConnectCount(phone) >= MAX_CONNECT_RETRY) {
      this.setStatus(phone, 'blocked')
      return true
    }
  }

  async syncConnections() {
    logger.info(`Syncing lost and blocked connections...`)
    try {
      const pattern = sessionStatusKey('*')
      const keys = await redisKeys(pattern)
      for (let i = 0; i < keys.length; i++) {
        const key = keys[i];
        const phone = key.replace(toReplaceStatus, '')
        if (await redisGet(key) == 'connecting' || !await getConfig(phone) ) {
          logger.info(`Sync ${phone} lost connecting!`)
          await this.setStatus(phone, 'disconnected')
        }
        if (await redisGet(key) == 'blocked' && await this.getConnectCount(phone) < MAX_CONNECT_RETRY) {
          logger.info(`Sync ${phone} blocked!`)
          await this.setStatus(phone, 'offline')
        }
      }
    } catch (error) {
      logger.error(error, 'Error on sync lost connecting')
      throw error
    }
  }
}