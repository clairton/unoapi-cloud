import {
  makeInMemoryStore,
  BaileysEventEmitter,
  proto,
  WAMessage,
  WAMessageUpdate,
  MessageUpsertType,
  WAMessageKey,
  WASocket,
  isJidGroup,
} from '@whiskeysockets/baileys'
import { DataStore } from './data_store'
import { getMessageType, TYPE_MESSAGES_TO_PROCESS_FILE } from './transformer'
import { getDataStore, dataStores } from './data_store'
import {
  delAuth,
  setMessage,
  getMessage,
  setJid,
  getJid,
  getKey,
  setKey,
  getUnoId,
  setUnoId,
  getTemplates,
  setMessageStatus,
  getMessageStatus,
} from './redis'
import { Config } from './config'
import logger from './logger'

export const getDataStoreRedis: getDataStore = (phone: string, config: Config): DataStore => {
  if (!dataStores.has(phone)) {
    logger.debug('Creating redis data store %s', phone)
    const store = dataStoreRedis(phone, config)
    dataStores.set(phone, store)
  } else {
    logger.debug('Retrieving redis data store %s', phone)
  }
  return dataStores.get(phone) as DataStore
}

const dataStoreRedis = (phone: string, config: Config): DataStore => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const store = makeInMemoryStore(config as any)
  const dataStore = store as unknown as DataStore
  const bind = store.bind
  store.bind = async (ev: BaileysEventEmitter) => {
    await bind(ev)
    // to prevent Value not found at KeyedDB.deleteById
    ev.removeAllListeners('chats.delete')
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ev.on('chats.delete', (deletions) => {
      for (const item of deletions) {
        logger.debug('chats.delete verify id: ', item)
        if (store.chats.get(item)) {
          logger.debug('chats.delete delete id: ', item)
          store.chats.deleteById(item)
        }
      }
    })
    ev.on('messages.upsert', async ({ messages }: { messages: WAMessage[]; type: MessageUpsertType }) => {
      for (const msg of messages) {
        const { key } = msg
        if (key.id) {
          await dataStore.setKey(key.id, key)
          // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
          await dataStore.setMessage(key.remoteJid!, msg)
          const messageType = getMessageType(msg)
          if (messageType && TYPE_MESSAGES_TO_PROCESS_FILE.includes(messageType)) {
            const { mediaStore } = await config.getStore(phone, config)
            await mediaStore.saveMedia(messageType, msg)
          }
        }
      }
    })
    ev.on('messages.update', (updates: WAMessageUpdate[]) => {
      for (const update of updates) {
        const { key } = update
        if (key.id) {
          dataStore.setKey(key.id, key)
        }
      }
    })
  }
  dataStore.loadKey = async (id: string) => {
    const key = await getKey(phone, id)
    const mkey: WAMessageKey = key as WAMessageKey
    return mkey
  }
  dataStore.setKey = async (id: string, key: WAMessageKey) => {
    await setKey(phone, id, key)
  }
  dataStore.loadUnoId = async (id: string) => await getUnoId(phone, id)
  dataStore.setUnoId = async (id: string, unoId: string) => setUnoId(phone, id, unoId)
  dataStore.getJid = async (phoneOrJid: string, sock: Partial<WASocket>) => {
    if (isJidGroup(phoneOrJid)) {
      return phoneOrJid
    }
    let jid = await getJid(phone, phoneOrJid)
    if (!jid) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let results: any[] = []
      try {
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        results = await sock.onWhatsApp!(phoneOrJid)
      } catch (_e) {
        logger.error(`Erro on check if ${phoneOrJid} has whatsapp`)
      }
      const result = results && results[0]
      if (result && result.exists && result.jid) {
        jid = result.jid
        logger.debug(`${phoneOrJid} exists on WhatsApp, as jid: ${jid}`)
        await setJid(phone, phoneOrJid, jid)
      } else {
        logger.warn(`${phoneOrJid} not exists on WhatsApp`)
      }
    }
    return jid || ''
  }
  dataStore.loadMessage = async (jid: string, id: string) => {
    const split = jid.split('@')
    const number = split[0].split(':')[0]
    const newJid = `${number}@${split[1]}`
    const m = await getMessage(phone, newJid, id)
    const wm = m as proto.IWebMessageInfo
    return wm
  }
  dataStore.setMessage = async (remoteJid: string, message: WAMessage) => {
    const split = remoteJid.split('@')
    const number = split[0].split(':')[0]
    const newJid = `${number}@${split[1]}`
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    return setMessage(phone, newJid, message.key.id!, message)
  }
  dataStore.cleanSession = async () => {
    await delAuth(phone)
  }
  dataStore.setStatus = async (
    id: string,
    status: 'scheduled' | 'pending' | 'error' | 'failed' | 'sent' | 'delivered' | 'read' | 'played' | 'accepted' | 'deleted',
  ) => {
    return setMessageStatus(phone, id, status)
  }
  dataStore.loadStatus = async (id: string) => {
    return getMessageStatus(phone, id)
  }
  dataStore.loadTemplates = async () => {
    const templates = await getTemplates(phone)
    if (templates) {
      return templates
    } else {
      const hello = {
        id: 1,
        name: 'hello',
        status: 'APPROVED',
        category: 'UTILITY',
        language: 'pt_BR',
        components: [
          {
            text: 'Olá!',
            type: 'BODY',
          },
        ],
      }

      const bulkReport = {
        id: 2,
        name: 'unoapi-bulk-report',
        status: 'APPROVED',
        category: 'UTILITY',
        language: 'pt_BR',
        components: [
          {
            text: `bulk: {{bulk}}`,
            type: 'BODY',
            parameters: [
              {
                type: 'text',
                text: 'bulk',
              },
            ],
          },
        ],
      }

      const webhook = {
        id: 3,
        name: 'unoapi-webhook',
        status: 'APPROVED',
        category: 'UTILITY',
        language: 'pt_BR',
        components: [
          {
            text: `url: {{url}}\nheader: {{header}}\ntoken: {{token}}`,
            type: 'BODY',
            parameters: [
              {
                type: 'text',
                text: 'url',
              },
              {
                type: 'text',
                text: 'header',
              },
              {
                type: 'text',
                text: 'token',
              },
            ],
          },
        ],
      }

      const config = {
        id: 4,
        name: 'unoapi-config',
        status: 'APPROVED',
        category: 'UTILITY',
        language: 'pt_BR',
        components: [
          {
            text: `logLevel: {{logLevel}}\nrejectCallsWebhook: {{rejectCallsWebhook}}\nrejectCalls: {{rejectCalls}}\ncomposingMessage: {{composingMessage}}\nsendConnectionStatus: {{sendConnectionStatus}}\nignoreOwnMessages: {{ignoreOwnMessages}}\nignoreYourselfMessages: {{ignoreYourselfMessages}}\nignoreHistoryMessages: {{ignoreHistoryMessages}}\nignoreGroupMessages: {{ignoreGroupMessages}}\nignoreBroadcastStatuses: {{ignoreBroadcastStatuses}}\nignoreBroadcastStatuses: {{ignoreBroadcastStatuses}}`,
            type: 'BODY',
            parameters: [
              {
                type: 'text',
                text: 'logLevel',
              },
              {
                type: 'text',
                text: 'rejectCallsWebhook',
              },
              {
                type: 'text',
                text: 'rejectCalls',
              },
              {
                type: 'boolean',
                text: 'composingMessage',
              },
              {
                type: 'boolean',
                text: 'composingMessage',
              },
              {
                type: 'boolean',
                text: 'ignoreOwnMessages',
              },
              {
                type: 'boolean',
                text: 'ignoreYourselfMessages',
              },
              {
                type: 'boolean',
                text: 'ignoreHistoryMessages',
              },
              {
                type: 'boolean',
                text: 'ignoreGroupMessages',
              },
              {
                type: 'boolean',
                text: 'ignoreBroadcastStatuses',
              },
              {
                type: 'boolean',
                text: 'ignoreBroadcastStatuses',
              },
            ],
          },
        ],
      }

      return [hello, bulkReport, webhook, config]
    }
  }
  return dataStore
}
