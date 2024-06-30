import { getClient, ConnectionInProgress } from './client'
import { getConfig } from './config'
import { SessionStore } from './session_store'
import { Listener } from './listener'
import { Incoming } from './incoming'
import { OnNewLogin } from './socket'
import logger from './logger'

export const autoConnect = async (
  sessionStore: SessionStore,
  incoming: Incoming,
  listener: Listener,
  getConfig: getConfig,
  getClient: getClient,
  onNewLogin: OnNewLogin,
) => {
  try {
    const phones = await sessionStore.getPhones()
    logger.info(`${phones.length} phones to verify if is auto connect`)
    for (let i = 0, j = phones.length; i < j; i++) {
      const phone = phones[i]
      try {
        const config = await getConfig(phone)
        if (config.provider !== 'baileys') {
          logger.info(`Ignore connecting phone ${phone} is not provider baileys...`)
          continue;
        }
        logger.info(`Auto connecting phone ${phone}...`)
        try {
          getClient({ phone, incoming, listener, getConfig, onNewLogin })
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
        logger.error(error, `Error on connect phone ${phone}`)
      }
    }
  } catch (error) {
    logger.error(error, 'Erro on auto connect')
    throw error
  }
}
