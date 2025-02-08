import { MAX_CONNECT_RETRY } from '../defaults'
import logger from './logger'

export type sessionStatus = 'offline' | 'online' | 'disconnected' | 'connecting' | 'blocked'

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

  async isStatusBlocked(phone: string) {
    return await this.getStatus(phone) == 'blocked'
  }

  async getConnectCount(phone: string) {
    return retries.get(phone) || 0
  }

  async incrementConnectCountAndVerify(phone: string) {
    const count = retries.get(phone) || 0
    retries.set(phone, count + 1)
    if (retries.get(phone)! >= MAX_CONNECT_RETRY) {
      this.setStatus(phone, 'blocked')
      return true
    }
  }

  async isStatusBlockedAndVerify(phone: string) {
    if (await this.isStatusBlocked(phone)) {
      if (await this.getConnectCount(phone) < MAX_CONNECT_RETRY) {
        await this.setStatus(phone, 'offline')
        return false
      }
      logger.warn('Blocked %s', phone)
      return true
    }
    return this.incrementConnectCountAndVerify(phone)
  }

  async syncConnections() {}
}
