import { SessionStore, sessionStatus } from './session_store'
import { configKey, authKey, redisKeys, getSessionStatus, setSessionStatus, sessionStatusKey, redisGet, getConnectCount, setConnectCount, delAuth, clearConnectCount } from './redis'
import logger from './logger'
import { MAX_CONNECT_RETRY, MAX_CONNECT_TIME } from '../defaults'

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
    if (status == 'online') {
      await this.clearConnectCount(phone)
    }
    return setSessionStatus(phone, status)
  }

  async getConnectCount(phone: string) {
    return getConnectCount(phone)
  }

  async incrementConnectCount(phone: string) {
    const count = await this.getConnectCount(phone)
    await setConnectCount(phone, count + 1, MAX_CONNECT_TIME)
  }

  async clearConnectCount(phone: string) {
    logger.info('Clear count connect for %s', phone)
    return clearConnectCount(phone)
  }

  async syncConnections() {
    logger.info(`Syncing lost and blocked connections...`)
    try {
      const pattern = sessionStatusKey('*')
      const keys = await redisKeys(pattern)
      for (let i = 0; i < keys.length; i++) {
        const key = keys[i];
        const phone = key.replace(toReplaceStatus, '')
        await this.syncConnection(phone)
      }
    } catch (error) {
      logger.error(error, 'Error on sync lost connecting')
      throw error
    }
  }

  async syncConnection(phone: string) {
    logger.info(`Syncing ${phone} lost connection`)
    if(await this.isStatusRestartRequired(phone)) {
      logger.info(`Restart required ${phone}`)
      return
    }
    const aKey = authKey(`${phone}*`)
    const keys = await redisKeys(aKey)
    logger.info(`Found auth ${keys.length} keys for session ${phone}`)
    if (keys.length == 1 && keys[0] == authKey(`${phone}:creds`)) {
      await delAuth(phone)
      await this.setStatus(phone, 'disconnected')
    }
    const key = sessionStatusKey(phone)
    if (await redisGet(key) == 'blocked' && await this.getConnectCount(phone) < MAX_CONNECT_RETRY) {
      logger.info(`Sync ${phone} blocked!`)
      await this.setStatus(phone, 'offline')
    }
  }
}