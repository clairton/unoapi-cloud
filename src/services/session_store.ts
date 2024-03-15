import { CONNECTING_TIMEOUT_MS } from '../defaults'
import logger from './logger'

const statuses: Map<string, string> = new Map<string, string>()

export const getSessionStatus = async (phone: string) => statuses.get(phone) || 'disconnected'

export const setSessionStatus = async (phone: string, status: 'offline' | 'online' | 'disconnected' | 'connecting') => {
  logger.info(`Session status ${phone} change from ${await getSessionStatus(phone)} to ${status}`)
  if (status == 'connecting') {
    setTimeout(() => {
      if (statuses.get(phone) == 'connecting') {
        statuses.set(phone, 'disconnected')
      }
    }, CONNECTING_TIMEOUT_MS)
  }
  statuses.set(phone, status)
}

export const isSessionStatusOnline = async (phone: string) => (await getSessionStatus(phone)) == 'online'
export const isSessionStatusConnecting = async (phone: string) => (await getSessionStatus(phone)) == 'connecting'
export const isSessionStatusOffline = async (phone: string) => (await getSessionStatus(phone)) == 'offline'
export const isSessionStatusIsDisconnect = async (phone: string) => (await getSessionStatus(phone)) == 'disconnected'

export interface SessionStore {
  getPhones(): Promise<string[]>
}
