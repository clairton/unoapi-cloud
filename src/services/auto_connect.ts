import { getClient, ConnectionInProgress } from './client'
import { getConfig } from './config'
import { SessionStore } from './session_store'
import { Outgoing } from './outgoing'
import { Incoming } from './incoming'
import { OnNewLogin } from './socket'
import logger from './logger'

export const autoConnect = async (
  sessionStore: SessionStore,
  incoming: Incoming,
  outgoing: Outgoing,
  getConfig: getConfig,
  getClient: getClient,
  onNewLogin: OnNewLogin,
) => {
  try {
    const phones = await sessionStore.getPhones()
    logger.info(`${phones.length} phones to verify is auto connect`)
    for (let i = 0, j = phones.length; i < j; i++) {
      const phone = phones[i]
      try {
        logger.info(`Auto connecting phone ${phone}...`)
        try {
          getClient({ phone, incoming, outgoing, getConfig, onNewLogin })
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
        } catch (e: any) {
          if (e instanceof ConnectionInProgress) {
            logger.info(`Connection already in progress ${phone}...`)
          } else {
            throw e
          }
        }
        logger.info(`Auto connected phone ${phone}!`)
      } catch (error) {
        logger.error(`Error on connect phone ${phone}`, error)
      }
    }
  } catch (error) {
    logger.error('Erro on auto connect', error)
    throw error
  }
}
