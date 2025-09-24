import { amqpPublish } from '../amqp'
import { IGNORE_OWN_MESSAGES_DECRYPT_ERROR, UNOAPI_EXCHANGE_BRIDGE_NAME, UNOAPI_QUEUE_LISTENER, UNOAPI_SERVER_NAME } from '../defaults'
import { Listener } from '../services/listener'
import logger from '../services/logger'
import { Outgoing } from '../services/outgoing'
import { DecryptError, isOutgoingMessage } from '../services/transformer'
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

  async consume(phone: string, data: object, options?: { countRetries: number; maxRetries: number, priority: 0 }) {
    const config = await this.getConfig(phone)
    if (config.server !== UNOAPI_SERVER_NAME) {
      logger.info(`Ignore listener routing key ${phone} server ${config.server} is not server current server ${UNOAPI_SERVER_NAME}...`)
      return;
    }
    if (config.provider !== 'baileys') {
      logger.info(`Ignore listener routing key ${phone} is not provider baileys...`)
      return;
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const a = { ...data as any }
    const { messages, type } = a
    if (a.splited) {
      try {
        await this.listener.process(phone, messages, type)
      } catch (error) {
        const store = await config.getStore(phone, config)
        const { dataStore } = store
        if (error instanceof DecryptError) {
          if (await dataStore.getMessageDecrypted(error.getOriginalId())) {

          } else if (IGNORE_OWN_MESSAGES_DECRYPT_ERROR && isOutgoingMessage(error.getContent())) {
            logger.warn('Ignore decrypt erro for own message')
          } else if (options && options?.countRetries >= options?.maxRetries) {
            // send message asking to open whatsapp to see
            await this.outgoing.send(phone, error.getContent())
          }
        } else {
          logger.warn('Decrypt error message, try again...')
          throw error
        }
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
              { type: 'direct' }
            )
         })
        )
      } else {
        await Promise.all(messages.
          map(async (m: object) => {
            return amqpPublish(
              UNOAPI_EXCHANGE_BRIDGE_NAME,
              `${UNOAPI_QUEUE_LISTENER}.${UNOAPI_SERVER_NAME}`,
              phone,
              { messages: [m], type, splited: true },
              { type: 'direct' }
            )
          })
        )
      }
    }
  }
}
