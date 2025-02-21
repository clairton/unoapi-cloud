import { MAX_CONNECT_RETRY } from '../defaults'
import logger from './logger'

export type sessionStatus = 'offline' | 'online' | 'disconnected' | 'connecting' | 'blocked' | 'restart_required'

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

  async incrementConnectCount(phone: string) {
    const count = await this.getConnectCount(phone)
    retries.set(phone, count + 1)
  }

  async isStatusBlocked(phone: string) {
    if (await this.getStatus(phone) == 'blocked') {
      if (await this.getConnectCount(phone) < MAX_CONNECT_RETRY) {
        await this.setStatus(phone, 'offline')
        return false
      }
      logger.warn('Blocked %s', phone)
      return true
    }
    const count = await this.getConnectCount(phone)
    if (count >= MAX_CONNECT_RETRY) {
      this.setStatus(phone, 'blocked')
      return true
    }
    await this.incrementConnectCount(phone)
    return false
  }

  async syncConnections() {}

  async syncConnection(_phone: string) {}
}
