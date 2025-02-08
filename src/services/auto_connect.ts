import { getClient, ConnectionInProgress } from './client'
import { getConfig } from './config'
import { SessionStore } from './session_store'
import { Listener } from './listener'
import { Incoming } from './incoming'
import { OnNewLogin } from './socket'
import logger from './logger'
import { UNOAPI_SERVER_NAME } from '../defaults'

export const autoConnect = async (
  sessionStore: SessionStore,
  incoming: Incoming,
  listener: Listener,
  getConfig: getConfig,
  getClient: getClient,
  onNewLogin: OnNewLogin,
) => {
  try {
    await sessionStore.syncConnections()
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
        if (config.server !== UNOAPI_SERVER_NAME) {
          logger.info(`Ignore connecting phone ${phone} server ${config.server} is not server current server ${UNOAPI_SERVER_NAME}...`)
          continue;
        }
        logger.info(`Auto connecting phone ${phone}...`)
        try {
          const store = await config.getStore(phone, config)
          const { sessionStore } = store
          if (await sessionStore.isStatusConnecting(phone) || await sessionStore.isStatusOnline(phone)) {
            logger.info(`Update session status to auto connect ${phone}...`)
            await sessionStore.setStatus(phone, 'offline')
          }
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
