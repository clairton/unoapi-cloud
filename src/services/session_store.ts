import logger from './logger'

export type sessionStatus = 'offline' | 'online' | 'disconnected' | 'connecting'

const statuses: Map<string, string> = new Map<string, string>()


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

  async isStatusIsDisconnect(phone: string) {
    return await this.getStatus(phone) == 'disconnected'
  }

  async syncConnecting() {}
}
