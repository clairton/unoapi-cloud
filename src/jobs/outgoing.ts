import { Outgoing } from '../services/outgoing'
import { UNOAPI_JOB_OUTGOING } from '../defaults'
import { amqpEnqueue } from '../amqp'
import { DecryptError, getMessageType } from '../services/transformer'
import { getConfig } from '../services/config'
import logger from '../services/logger'

export class OutgoingJob {
  private service: Outgoing
  private getConfig: getConfig
  private queueOutgoing: string
  private queueIncoming: string

  constructor(service: Outgoing, getConfig: getConfig, queueOutgoing: string = UNOAPI_JOB_OUTGOING, queueIncoming: string = UNOAPI_JOB_OUTGOING) {
    this.service = service
    this.getConfig = getConfig
    this.queueOutgoing = queueOutgoing
    this.queueIncoming = queueIncoming
  }

  async consume(data: object) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const a = data as any
    const phone: string = a.phone
    const config = await this.getConfig(phone)
    if (a.split) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const messages: any[] = a.payload
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const filteredMessages = messages.filter((m: any) => {
        return m.key && m.key.remoteJid && !config.shouldIgnoreJid(m.key.remoteJid) && !config.shouldIgnoreKey(m.key, getMessageType(m))
      })
      logger.debug('%s filtereds messages/updates of %s', messages.length - filteredMessages.length, messages.length)
      await Promise.all(filteredMessages.map(async (m) => amqpEnqueue(this.queueOutgoing, phone, { phone, payload: m, split: false })))
    } else {
      const key = a.payload.key
      const store = await config.getStore(phone, config)
      // possible update message
      if (key && key?.fromMe) {
        const idUno = await store.dataStore.loadUnoId(key.id)
        logger.debug('Unoapi id %s to Baileys id %s', idUno, a.payload.key.id)
        if (idUno) {
          a.payload.key.id = idUno
        }
      }
      // reaction
      const reactionId = a.payload?.message?.reactionMessage?.key?.id
      if (reactionId) {
        const unoReactionId = await store.dataStore.loadUnoId(reactionId)
        if (unoReactionId) {
          logger.debug('Unoapi reaction id %s to Baileys reaction id %s', unoReactionId, reactionId)
          a.payload.message.reactionMessage.key.id = unoReactionId
        } else {
          logger.debug('Unoapi reaction id %s not overrided', reactionId)
        }
      }
      // quoted
      const messageType = getMessageType(a?.payload)
      const binMessage = messageType && a?.payload?.message && a?.payload.message[messageType]
      const stanzaId = binMessage?.contextInfo?.stanzaId
      if (messageType && stanzaId) {
        const unoStanzaId = await store.dataStore.loadUnoId(stanzaId)
        if (unoStanzaId) {
          logger.debug('Unoapi stanza id %s to Baileys stanza id %s', unoStanzaId, stanzaId)
          a.payload.message[messageType].contextInfo.stanzaId = unoStanzaId
        } else {
          logger.debug('Unoapi stanza id %s not overrided', stanzaId)
        }
      }
      try {
        await this.service.sendOne(phone, a.payload)
      } catch (error) {
        if (error instanceof DecryptError) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const message = (error.getContent() as any)?.entry[0]?.changes[0]?.value?.messages[0]
          if (message.id) {
            const payload = {
              messaging_product: 'whatsapp',
              context: {
                message_id: message.id,
              },
              to: message.to,
              type: 'text',
              text: {
                body: '.',
              },
            }
            await amqpEnqueue(this.queueIncoming, phone, { phone, payload })
            await this.service.send(phone, error.getContent())
          }
        } else {
          throw error
        }
      }
    }
  }
}
