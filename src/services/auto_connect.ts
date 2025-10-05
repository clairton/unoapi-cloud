import { getClient, ConnectionInProgress } from './client'
import { getConfig } from './config'
import { SessionStore } from './session_store'
import { Listener } from './listener'
import { OnNewLogin } from './socket'
import logger from './logger'
import { UNOAPI_EXCHANGE_BRIDGE_NAME, UNOAPI_QUEUE_BIND, UNOAPI_SERVER_NAME } from '../defaults'
import { amqpPublish } from '../amqp'

export const autoConnect = async (
  sessionStore: SessionStore,
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
        if (config.provider && !['forwarder', 'baileys', 'whatsmeow'].includes(config.provider)) {
          logger.info(`Ignore connecting phone ${phone} provider ${config.provider}...`)
          continue
        }
        // Do not attempt local connection for external providers
        if (config.provider === 'whatsmeow' || config.provider === 'forwarder') {
          // For external providers, proactively request BindBridge to attach
          // per-phone consumers on incoming bridge queues.
          await amqpPublish(
            UNOAPI_EXCHANGE_BRIDGE_NAME,
            `${UNOAPI_QUEUE_BIND}.${UNOAPI_SERVER_NAME}`,
            '',
            { routingKey: phone },
            { type: 'direct' },
          )
          logger.info(`Provider ${config.provider} uses external adapter. Skipping auto connect for ${phone}...`)
          continue
        }
        if (config.server && config.server !== UNOAPI_SERVER_NAME) {
          logger.info(`Ignore connecting phone ${phone} server ${config.server} is not server current server ${UNOAPI_SERVER_NAME}...`)
          continue;
        }
        await sessionStore.syncConnection(phone)
        if (await sessionStore.isStatusStandBy(phone)) {
          logger.info(`Session standby ${phone}...`)
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
          getClient({ phone, listener, getConfig, onNewLogin })
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
