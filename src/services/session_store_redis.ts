import { SessionStore } from './session_store'
import { configKey, redisKeys } from './redis'
import logger from './logger'

const toReplace = configKey('')

export class SessionStoreRedis implements SessionStore {
  async getPhones(): Promise<string[]> {
    try {
      const pattern = configKey('*')
      const keys = await redisKeys(pattern)
      return keys.map((key: string) => key.replace(toReplace, ''))
    } catch (error) {
      logger.error('Erro on auto connect', error)
      throw error
    }
  }
}
