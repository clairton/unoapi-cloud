import { MAX_CONNECT_RETRY } from '../defaults'
import logger from './logger'

export type sessionStatus = 'offline' | 'online' | 'disconnected' | 'connecting' | 'standby' | 'restart_required'

const statuses: Map<string, string> = new Map<string, string>()
const retries: Map<string, number> = new Map<string, number>()


export abstract class SessionStore {
  abstract getPhones(): Promise<string[]>

  async getStatus(phone: string) {
    return statuses.get(phone) || 'disconnected'
  }

  async setStatus(phone: string, status: sessionStatus) {
    logger.info(`Session status ${phone} change from ${await this.getStatus(phone)} to ${status}`)
    statuses.set(phone, status) 
  }

  async isStatusOnline(phone: string) {
    return await this.getStatus(phone) == 'online'
  }

  async isStatusConnecting(phone: string) {
    return await this.getStatus(phone) == 'connecting'
  }

  async isStatusOffline(phone: string) {
    return await this.getStatus(phone) == 'offline'
  }

  async isStatusDisconnect(phone: string) {
    return await this.getStatus(phone) == 'disconnected'
  }

  async isStatusRestartRequired(phone: string) {
    return await this.getStatus(phone) == 'restart_required'
  }

  async getConnectCount(phone: string) {
    return retries.get(phone) || 0
  }

  async setConnectCount(phone: string, count) {
    retries.set(phone, count)
  }

  async isStatusStandBy(phone: string) {
    return await this.getStatus(phone) == 'standby'
  }

  async verifyStatusStandBy(phone: string) {
    const count = await this.getConnectCount(phone)
    if (await this.getStatus(phone) == 'standby') {
      if (count < MAX_CONNECT_RETRY) {
        logger.warn('Stand by removed %s', phone)
        await this.setStatus(phone, 'offline')
        return false
      }
      logger.warn('Stand by %s', phone)
      return true
    } else if (count > MAX_CONNECT_RETRY) {
      this.setStatus(phone, 'standby')
      return true
    }
    await this.setConnectCount(phone, count + 1)
    return false
  }

  async syncConnections() {}

  async syncConnection(_phone: string) {}
}
