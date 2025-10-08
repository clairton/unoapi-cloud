import { amqpPublish } from '../amqp'
import { IGNORE_OWN_MESSAGES_DECRYPT_ERROR, UNOAPI_EXCHANGE_BRIDGE_NAME, UNOAPI_QUEUE_LISTENER, UNOAPI_SERVER_NAME } from '../defaults'
import { Listener } from '../services/listener'
import logger from '../services/logger'
import { Outgoing } from '../services/outgoing'
import { isDecryptError, isOutgoingMessage } from '../services/transformer'
import { getConfig } from '../services/config'

export class ListenerJob {
  private listener: Listener
  private outgoing: Outgoing
  private getConfig: getConfig

  constructor(listener: Listener, outgoing: Outgoing, getConfig: getConfig) {
    this.listener = listener
    this.outgoing = outgoing
    this.getConfig = getConfig
  }

  async consume(phone: string, data: object, options?: { countRetries: number; maxRetries: number; priority: 0 }) {
    const config = await this.getConfig(phone)
    if (config.server !== UNOAPI_SERVER_NAME) {
      logger.info(`Ignore listener routing key ${phone} server ${config.server} is not server current server ${UNOAPI_SERVER_NAME}...`)
      return
    }
    if (config.provider !== 'baileys') {
      logger.info(`Ignore listener routing key ${phone} is not provider baileys...`)
      return
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const a = { ...(data as any) }
    const { messages, type } = a
    if (a.splited) {
      try {
        await this.listener.process(phone, messages, type)
      } catch (error) {
        const store = await config.getStore(phone, config)
        const { dataStore } = store
        if (isDecryptError(error)) {
          const currentStatus = await dataStore.loadStatus(error.getMessageId())
          logger.debug('Retrieved message %s status %s', error.getMessageId(), currentStatus)
          if (currentStatus != 'decryption_failed') {
            logger.debug('Ignore decrypt error because message status is not decryption_failed %s', error.getMessageId())
            return
          } else if (IGNORE_OWN_MESSAGES_DECRYPT_ERROR && isOutgoingMessage(error.getContent())) {
            logger.debug('Ignore decrypt error for own message %s', error.getMessageId())
            return
          } else if (options && options?.countRetries >= options?.maxRetries) {
            logger.warn('Decryption error overread max retries message %s', error.getMessageId())
            // send message asking to open whatsapp to see
            await amqpPublish(
              UNOAPI_EXCHANGE_BRIDGE_NAME,
              `${UNOAPI_QUEUE_LISTENER}.${UNOAPI_SERVER_NAME}.undecryptable`,
              phone,
              { messages, type },
              { withoutRetry: true, type: 'direct' },
            )
            return this.outgoing.send(phone, error.getContent())
          }
        }
        throw error
      }
    } else {
      if (type == 'delete' && messages.keys) {
        await Promise.all(
          messages.keys.map(async (m: object) => {
            return amqpPublish(
              UNOAPI_EXCHANGE_BRIDGE_NAME,
              `${UNOAPI_QUEUE_LISTENER}.${UNOAPI_SERVER_NAME}`,
              phone,
              { messages: { keys: [m] }, type, splited: true },
              { type: 'direct' },
            )
          }),
        )
      } else {
        await Promise.all(
          messages.map(async (m: object) => {
            return amqpPublish(
              UNOAPI_EXCHANGE_BRIDGE_NAME,
              `${UNOAPI_QUEUE_LISTENER}.${UNOAPI_SERVER_NAME}`,
              phone,
              { messages: [m], type, splited: true },
              { type: 'direct' },
            )
          }),
        )
      }
    }
  }
}
