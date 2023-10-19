import { Outgoing } from '../services/outgoing'
import { UNOAPI_JOB_OUTGOING } from '../defaults'
import { amqpEnqueue } from '../amqp'
import { getMessageType } from '../services/transformer'
import { getConfig } from '../services/config'
import logger from '../services/logger'

export class OutgoingJob {
  private service: Outgoing
  private getConfig: getConfig
  private queueOutgoing: string

  constructor(service: Outgoing, getConfig: getConfig, queueOutgoing: string = UNOAPI_JOB_OUTGOING) {
    this.service = service
    this.getConfig = getConfig
    this.queueOutgoing = queueOutgoing
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
      await Promise.all(filteredMessages.map(async (m) => amqpEnqueue(this.queueOutgoing, { phone, payload: m, split: false })))
    } else {
      const key = a.payload.key
      // possible update message
      if (key && key?.fromMe) {
        const store = await config.getStore(phone, config)
        const idUno = await store.dataStore.loadUnoId(key.id)
        logger.debug('Unoapi id %s to Baileys id %s', idUno, a.payload.key.id)
        if (idUno) {
          a.payload.key.id = idUno
        }
        // reaction
        const reactionId = a.payload?.message?.reactionMessage?.key?.id
        if (reactionId) {
          const unoReactionId = await store.dataStore.loadUnoId(reactionId)
          a.payload.message.reactionMessage.key.id = unoReactionId
        }
        // quoted
        const messageType = getMessageType(a?.payload)
        const binMessage = messageType && a?.payload?.message && a?.payload.message[messageType]
        if (messageType && binMessage?.contextInfo?.quotedMessage?.stanzaId) {
          const unoStanzaId = await store.dataStore.loadUnoId(binMessage.contextInfo.quotedMessage.stanzaId)
          a.payload.message[messageType].contextInfo.quotedMessage.stanzaId = unoStanzaId
        }
      }
      await this.service.sendOne(phone, a.payload)
    }
  }
}
