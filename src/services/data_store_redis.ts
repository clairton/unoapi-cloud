import { proto, WAMessage, WAMessageKey, isJidGroup, GroupMetadata } from '@whiskeysockets/baileys'
import { DataStore } from './data_store'
import { jidToPhoneNumber, phoneNumberToJid } from './transformer'
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
  getProfilePicture,
  setProfilePicture,
  setGroup,
  getGroup,
} from './redis'
import { Config } from './config'
import logger from './logger'
import { getDataStoreFile } from './data_store_file'

export const getDataStoreRedis: getDataStore = async (phone: string, config: Config): Promise<DataStore> => {
  if (!dataStores.has(phone)) {
    logger.debug('Creating redis data store %s', phone)
    const store = await dataStoreRedis(phone, config)
    dataStores.set(phone, store)
  } else {
    logger.debug('Retrieving redis data store %s', phone)
  }
  return dataStores.get(phone) as DataStore
}

const dataStoreRedis = async (phone: string, config: Config): Promise<DataStore> => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const store: DataStore = await getDataStoreFile(phone, config)
  store.loadKey = async (id: string) => {
    const key = await getKey(phone, id)
    const mkey: WAMessageKey = key as WAMessageKey
    return mkey
  }
  store.setKey = async (id: string, key: WAMessageKey) => {
    await setKey(phone, id, key)
  }
  store.getImageUrl = async (jid: string) => {
    return getProfilePicture(phone, jid)
  }
  store.setImageUrl = async (jid: string, url: string) => {
    await setProfilePicture(phone, jid, url)
  }
  store.getGroupMetada = async (jid: string) => {
    return getGroup(phone, jid)
  }
  store.setGroupMetada = async (jid: string, data: GroupMetadata) => {
    return setGroup(phone, jid, data)
  }
  store.loadUnoId = async (id: string) => await getUnoId(phone, id)
  store.setUnoId = async (id: string, unoId: string) => setUnoId(phone, id, unoId)

  store.loadJid = async (phoneOrJid: string) => {
    return getJid(phone, phoneOrJid)
  }
  store.setJid = async (phoneOrJid: string, jid: string) => {
    await setJid(phone, phoneOrJid, jid)
  }
  store.loadMessage = async (remoteJid: string, id: string) => {
    const newJid = isJidGroup(remoteJid) ? remoteJid : phoneNumberToJid(jidToPhoneNumber(remoteJid))
    const m = await getMessage(phone, newJid, id)
    const wm = m as proto.IWebMessageInfo
    return wm
  }
  store.setMessage = async (remoteJid: string, message: WAMessage) => {
    const newJid = isJidGroup(remoteJid) ? remoteJid : phoneNumberToJid(jidToPhoneNumber(remoteJid))
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    return setMessage(phone, newJid, message.key.id!, message)
  }
  store.cleanSession = async () => {
    await delAuth(phone)
  }
  store.setStatus = async (
    id: string,
    status: 'scheduled' | 'pending' | 'error' | 'failed' | 'sent' | 'delivered' | 'read' | 'played' | 'accepted' | 'deleted',
  ) => {
    return setMessageStatus(phone, id, status)
  }
  store.loadStatus = async (id: string) => {
    return getMessageStatus(phone, id)
  }
  store.loadTemplates = async () => {
    const templates = await getTemplates(phone)
    if (templates) {
      return templates
    } else {
      const hello = {
        id: 1,
        name: 'hello',
        status: 'APPROVED',
        category: 'UTILITY',
        components: [
          {
            text: '{{hello}}',
            type: 'BODY',
            parameters: [
              {
                type: 'text',
                text: 'hello',
              },
            ],
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
            text: `logLevel: {{logLevel}}\nrejectCallsWebhook: {{rejectCallsWebhook}}\nrejectCalls: {{rejectCalls}}\ncomposingMessage: {{composingMessage}}\nsendConnectionStatus: {{sendConnectionStatus}}\nignoreOwnMessages: {{ignoreOwnMessages}}\nignoreYourselfMessages: {{ignoreYourselfMessages}}\nignoreHistoryMessages: {{ignoreHistoryMessages}}\nignoreGroupMessages: {{ignoreGroupMessages}}\nignoreBroadcastStatuses: {{ignoreBroadcastStatuses}}`,
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
            ],
          },
        ],
      }

      return [hello, bulkReport, webhook, config]
    }
  }
  return store
}
