import { CONNECTING_TIMEOUT_MS } from '../defaults'
import logger from './logger'

const TIMEOUT_STATUSES = ['qrcode', 'connecting']

const statuses: Map<string, string> = new Map<string, string>()

export const getSessionStatus = async (phone: string) => statuses.get(phone) || 'disconnected'

export const setSessionStatus = async (phone: string, status: 'offline' | 'online' | 'disconnected' | 'connecting' | 'qrcode') => {
  if (TIMEOUT_STATUSES.includes(status)) {
    setTimeout(async () => {
      const s = statuses.get(phone)
      if (s && TIMEOUT_STATUSES.includes(s)) {
        logger.info('Session %s status connecting timeout config to %s', phone, CONNECTING_TIMEOUT_MS)
        await setSessionStatus(phone, 'disconnected')
      }
    }, CONNECTING_TIMEOUT_MS)
  }
  logger.info('Session %s status set to %s', phone, status)
  statuses.set(phone, status)
}

export const isSessionStatusOnline = async (phone: string) => (await getSessionStatus(phone)) == 'online'
export const isSessionStatusConnecting = async (phone: string) => TIMEOUT_STATUSES.includes(await getSessionStatus(phone))
export const isSessionStatusOffline = async (phone: string) => (await getSessionStatus(phone)) == 'offline'
export const isSessionStatusIsDisconnect = async (phone: string) => (await getSessionStatus(phone)) == 'disconnected'

export interface SessionStore {
  getPhones(): Promise<string[]>
}
