import { Listener } from './listener'
import logger from './logger'
import { Outgoing } from './outgoing'
import { getConfig } from './config'
import { fromBaileysMessageContent, getMessageType, BindTemplateError, isSaveMedia } from './transformer'
import { WAMessage } from '@whiskeysockets/baileys'
import { Template } from './template'

export class ListenerBaileys implements Listener {
  private outgoing: Outgoing
  private getConfig: getConfig

  constructor(outgoing: Outgoing, getConfig: getConfig) {
    this.outgoing = outgoing
    this.getConfig = getConfig
  }

  async process(phone: string, messages: object[], type: 'qrcode' | 'status' | 'history' | 'append' | 'notify' | 'message' | 'update' | 'delete') {
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
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const filteredMessages = messages.filter((m: any) => {
      return (
        m?.key?.remoteJid && (type == 'qrcode' || (!config.shouldIgnoreJid(m.key.remoteJid) && !config.shouldIgnoreKey(m.key, getMessageType(m))))
      )
    })
    logger.debug('%s filtereds messages/updates of %s', messages.length - filteredMessages.length, messages.length)
    await Promise.all(filteredMessages.map(async (m: object) => this.sendOne(phone, m)))
  }

  public async sendOne(phone: string, message: object) {
    logger.debug(`Receive message %s`, JSON.stringify(message))
    let i: WAMessage = message as WAMessage
    const messageType = getMessageType(message)
    logger.debug(`messageType %s...`, messageType)
    const config = await this.getConfig(phone)
    const store = await config.getStore(phone, config)
    if (messageType && !['update', 'receipt'].includes(messageType)) {
      i = await config.getMessageMetadata(i)
      if (i.key && i.key.id) {
        await store?.dataStore.setKey(i.key.id, i.key)
        if (i.key.remoteJid) {
          await store.dataStore.setMessage(i.key.remoteJid, i)
        }
      }
    }
    if (isSaveMedia(i)) {
      logger.debug(`Saving media...`)
      i = await store?.mediaStore.saveMedia(i)
    }

    const key = i.key
    // possible update message
    if (key && key?.fromMe && key.id) {
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
      data = fromBaileysMessageContent(phone, i)
    } catch (error) {
      if (error instanceof BindTemplateError) {
        const template = new Template(this.getConfig)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const i: any = message
        data = await template.bind(phone, i.template.name, i.template.components)
      } else {
        throw error
      }
    } finally {
      const state = data?.entry[0]?.changes[0]?.value?.statuses[0] || {}
      if (state) {
        const status = state.status || 'error'
        const id = state.id
        await store?.dataStore?.setStatus(id, status)
      }
    }
    if (data) {
      return this.outgoing.send(phone, data)
    } else {
      logger.debug(`Not send message type ${messageType} to http phone %s message id %s`, phone, i?.key?.id)
    }
  }
}
