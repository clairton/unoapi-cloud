import { SessionStore, sessionStatus } from './session_store'
import { configKey, redisKeys, getSessionStatus, setSessionStatus } from './redis'
import logger from './logger'

const toReplace = configKey('')

export class SessionStoreRedis extends SessionStore {
  async getPhones(): Promise<string[]> {
    try {
      const pattern = configKey('*')
      const keys = await redisKeys(pattern)
      return keys.map((key: string) => key.replace(toReplace, ''))
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
}