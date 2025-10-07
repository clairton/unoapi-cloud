import { eventType, Listener } from './listener'
import logger from './logger'
import { Outgoing } from './outgoing'
import { Broadcast } from './broadcast'
import { getConfig } from './config'
import {
  fromBaileysMessageContent,
  getMessageType,
  BindTemplateError,
  isSaveMedia,
  jidToPhoneNumber,
  DecryptError,
  isDecryptError,
  isBindTemplateError,
} from './transformer'
import { WAMessage, delay } from 'baileys'
import { Template } from './template'
import { UNOAPI_DELAY_AFTER_FIRST_MESSAGE_MS, UNOAPI_DELAY_BETWEEN_MESSAGES_MS } from '../defaults'
import { isUnoId, generateUnoId } from '../utils/id'

const delays: Map<String, number> = new Map()

const delayFunc =
  UNOAPI_DELAY_AFTER_FIRST_MESSAGE_MS && UNOAPI_DELAY_BETWEEN_MESSAGES_MS
    ? async (phone, to) => {
        if (to) {
          const key = `${phone}:${to}`
          const epochMS: number = Math.floor(Date.now())
          const lastMessage = (delays.get(key) || 0) as number
          const timeForNextMessage = lastMessage
            ? Math.floor(lastMessage + UNOAPI_DELAY_BETWEEN_MESSAGES_MS)
            : Math.floor(epochMS + UNOAPI_DELAY_AFTER_FIRST_MESSAGE_MS)
          const ms = timeForNextMessage - epochMS > 0 ? Math.floor(timeForNextMessage - epochMS) : 0
          logger.debug(`Delay for this message is: %s`, ms)
          if (ms) {
            delays.set(key, timeForNextMessage)
            await delay(ms)
          } else {
            delays.set(key, epochMS)
          }
        }
      }
    : async (_phone, _to) => {}

export class ListenerBaileys implements Listener {
  private outgoing: Outgoing
  private getConfig: getConfig
  private broadcast: Broadcast

  constructor(outgoing: Outgoing, broadcast: Broadcast, getConfig: getConfig) {
    this.outgoing = outgoing
    this.getConfig = getConfig
    this.broadcast = broadcast
  }

  async process(phone: string, messages: object[], type: eventType) {
    logger.debug('Received %s(s) %s', type, messages.length, phone)
    if (type == 'delete' && messages.keys) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      messages = (messages.keys as any).map((key: any) => {
        return { key, update: { status: 'DELETED' } }
      })
    }
    const config = await this.getConfig(phone)
    if (type === 'append' && !config.ignoreOwnMessages) {
      // filter self message send with this session to not send same message many times
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      messages = messages.filter((m: any) => !['PENDING', 1, '1'].includes(m?.status))
      if (!messages.length) {
        logger.debug('ignore messages.upsert type append with status pending')
        return
      }
    } else if (type == 'qrcode') {
      await this.broadcast.send(phone, type, messages[0]['message']['imageMessage']['url'])
      // await this.broadcast.send(
      //   phone,
      //   'status',
      //   messages[0]['message']['imageMessage']['caption']
      // )
    } else if (type === 'status') {
      await this.broadcast.send(phone, type, messages[0]['message']['conversation'])
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const filteredMessages = messages.filter((m: any) => {
      return (
        m?.key?.remoteJid &&
        (['qrcode', 'status'].includes(type) || (!config.shouldIgnoreJid(m.key.remoteJid) && !config.shouldIgnoreKey(m.key, getMessageType(m))))
      )
    })
    logger.debug('%s filtereds messages/updates of %s', messages.length - filteredMessages.length, messages.length)
    await Promise.all(filteredMessages.map(async (m: object) => this.sendOne(phone, m)))
  }

  public async sendOne(phone: string, message: object) {
    logger.debug('Listener receive message %s', JSON.stringify(message))
    let i: WAMessage = message as WAMessage
    const messageType = getMessageType(message)
    logger.debug('messageType %s...', messageType)
    const config = await this.getConfig(phone)
    const store = await config.getStore(phone, config)
    const idBaileys = i.key.id!
    if (messageType && !['update', 'receipt'].includes(messageType)) {
      i = await config.getMessageMetadata(i)
      await store.dataStore.setMessage(i.key.remoteJid!, i)
      if (!i.key['originalId']) {
        i.key['originalId'] = idBaileys
        const idUno = generateUnoId()
        await store.dataStore.setUnoId(idUno, idBaileys)
        await store.dataStore.setUnoId(idBaileys, idUno)
        await store.dataStore.setKey(idBaileys, i.key)
        i.key.id = idUno
        await store.dataStore.setMessage(i.key.remoteJid!, i)
      }
      await store.dataStore.setKey(i.key.id!, i.key)
      if (isSaveMedia(i)) {
        logger.debug('Saving media message id %s...', idBaileys)
        i = await store?.mediaStore.saveMedia(i)
        logger.debug('Saved media message id %s!', idBaileys)
      }
    }
    const key = i.key
    // possible update message or delete message
    if (key?.id && !isUnoId(key.id) && (key?.fromMe || (!key?.fromMe && (message as any)?.update?.messageStubType == 1))) {
      const idUno = await store.dataStore.loadUnoId(key.id)
      logger.debug('Unoapi id %s to Baileys id %s', idUno, key.id)
      if (idUno) {
        i.key.id = idUno
      }
    }

    // reaction
    if (i?.message?.reactionMessage?.key?.id) {
      const reactionId = i?.message?.reactionMessage?.key?.id
      const unoReactionId = await store.dataStore.loadUnoId(reactionId)
      if (unoReactionId) {
        logger.debug('Unoapi reaction id %s to Baileys reaction id %s', unoReactionId, reactionId)
        i.message.reactionMessage.key.id = unoReactionId
      } else {
        logger.debug('Unoapi reaction id %s not overrided', reactionId)
      }
    }

    // quoted
    const binMessage = messageType && i.message && i.message[messageType]
    const stanzaId = binMessage?.contextInfo?.stanzaId
    if (messageType && i.message && stanzaId) {
      const unoStanzaId = await store.dataStore.loadUnoId(stanzaId)
      if (unoStanzaId) {
        logger.debug('Unoapi stanza id %s to Baileys stanza id %s', unoStanzaId, stanzaId)
        i.message[messageType].contextInfo.stanzaId = unoStanzaId
      } else {
        logger.debug('Unoapi stanza id %s not overrided', stanzaId)
      }
    }

    let data
    try {
      const resp = fromBaileysMessageContent(phone, i, config)
      data = resp[0]
      const senderPhone = resp[1]
      const senderId = resp[2]
      const { dataStore } = await config.getStore(phone, config)
      await dataStore.setJidIfNotFound(jidToPhoneNumber(senderPhone, ''), senderId)
      logger.debug('Set message status decrypted %s', idBaileys)
      await store.dataStore.setStatus(idBaileys, 'decrypted')
    } catch (error) {
      if (isDecryptError(error)) {
        logger.debug('DecryptError exception set decryption_failed for message %s', idBaileys)
        await store.dataStore.setStatus(idBaileys, 'decryption_failed')
        throw error
      } else if (isBindTemplateError(error)) {
        const template = new Template(this.getConfig)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const i: any = message
        data = await template.bind(phone, i.template.name, i.template.components)
      } else {
        logger.warn('Unknown exception for message %s -> %e', idBaileys, error)
        throw error
      }
    } finally {
      const state = data?.entry[0]?.changes[0]?.value?.statuses[0] || {}
      if (state.id) {
        const status = state.status || 'error'
        const id = state.id
        logger.debug(`Set status message %s to %s`, id, status)
        await store.dataStore.setStatus(id, status)
      }
    }
    if (data) {
      const response = this.outgoing.send(phone, data)
      const to = i?.key?.remoteJid
      await delayFunc(phone, to)
      return response
    } else {
      logger.debug(`Not send message type ${messageType} to http phone %s message id %s`, phone, i?.key?.id)
    }
  }
}
