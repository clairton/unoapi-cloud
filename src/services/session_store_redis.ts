import { SessionStore, sessionStatus } from './session_store'
import {
  configKey,
  authKey,
  redisKeys,
  getSessionStatus,
  setSessionStatus,
  sessionStatusKey,
  redisGet,
  getConnectCount,
  setConnectCount,
  delAuth,
  clearConnectCount,
} from './redis'
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
      logger.error(error, 'Erro on get phones')
      throw error
    }
  }

  async getTokens(phone: string): Promise<string[]> {
    try {
      const pattern = configKey(phone)
      const keys = await redisKeys(pattern)
      return Promise.all(keys.map(async (k: string) => JSON.parse((await redisGet(k)) || '{}')?.authToken))
    } catch (error) {
      logger.error(error, 'Erro on get tokens')
      throw error
    }
  }

  async getStatus(phone: string) {
    return (await getSessionStatus(phone)) || 'disconnected'
  }

  async setStatus(phone: string, status: sessionStatus) {
    logger.info(`Session status ${phone} change from ${await this.getStatus(phone)} to ${status}`)
    if (['online', 'restart_required', 'reloading'].includes(status)) {
      await this.clearConnectCount(phone)
    }
    return setSessionStatus(phone, status)
  }

  async getConnectCount(phone: string) {
    return getConnectCount(phone)
  }

  async setConnectCount(phone: string, count) {
    await setConnectCount(phone, count, MAX_CONNECT_TIME)
  }

  async clearConnectCount(phone: string) {
    logger.info('Cleaning count connect for %s..', phone)
    await clearConnectCount(phone)
    logger.info('Cleaned count connect for %s!', phone)
  }

  async syncConnections() {
    logger.info(`Syncing lost and standby connections...`)
    try {
      const pattern = sessionStatusKey('*')
      const keys = await redisKeys(pattern)
      for (let i = 0; i < keys.length; i++) {
        const key = keys[i]
        const phone = key.replace(toReplaceStatus, '')
        await this.syncConnection(phone)
      }
      logger.info(`Synced lost and standby connections!`)
    } catch (error) {
      logger.error(error, 'Error on sync lost connecting')
      throw error
    }
  }

  async syncConnection(phone: string) {
    logger.info(`Syncing ${phone} lost connection`)
    if (await this.isStatusRestartRequired(phone)) {
      logger.info(`Is not lost connection, is restart required ${phone}`)
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
    if ((await redisGet(key)) == 'standby' && (await this.getConnectCount(phone)) < MAX_CONNECT_RETRY) {
      logger.info(`Sync ${phone} standby!`)
      await this.setStatus(phone, 'offline')
    }
  }
}
