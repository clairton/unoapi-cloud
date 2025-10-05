import { UNOAPI_EXCHANGE_BROKER_NAME, UNOAPI_QUEUE_OUTGOING } from '../defaults'
import { amqpPublish } from '../amqp'
import logger from '../services/logger'

export class IncomingWhatsmeow {
  async consume(phone: string, data: object) {
    // The adapter publishes Cloud API webhook payloads as { payload }
    // We forward them into the standard outgoing flow, where
    // OutgoingJob will fan-out per webhook and apply provider-specific handling.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const a = { ...(data as any) }
    const payload = a.payload || data
    logger.debug('IncomingWhatsmeow phone %s payload enqueued to outgoing', phone)
    await amqpPublish(UNOAPI_EXCHANGE_BROKER_NAME, UNOAPI_QUEUE_OUTGOING, phone, { payload }, { type: 'topic' })
  }
}

