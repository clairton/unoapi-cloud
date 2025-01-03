import { proto, WAMessage, WAMessageKey, isJidGroup, GroupMetadata } from 'baileys'
import { DataStore, MessageStatus } from './data_store'
import { jidToPhoneNumber, phoneNumberToJid } from './transformer'
import { getDataStore, dataStores } from './data_store'
import { ONLY_HELLO_TEMPLATE } from '../defaults'
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
  delConfig,
  setTemplates,
} from './redis'
import { Config } from './config'
import logger from './logger'
import { getDataStoreFile } from './data_store_file'
import { defaultConfig } from './config'
import { CLEAN_CONFIG_ON_DISCONNECT } from '../defaults'

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
    const url = await getProfilePicture(phone, jid)
    if (url) {
      url
    } else {
      const { mediaStore } = await config.getStore(phone, config)
      const profileUrl = await mediaStore.getProfilePictureUrl('', jid)
      if (profileUrl) {
        await setProfilePicture(phone, jid, profileUrl)
        return profileUrl
      }
    }
  }
  store.getGroupMetada = async (jid: string) => {
    return getGroup(phone, jid)
  }
  store.setGroupMetada = async (jid: string, data: GroupMetadata) => {
    return setGroup(phone, jid, data)
  }
  store.loadUnoId = async (id: string) => await getUnoId(phone, id)
  store.setUnoId = async (id: string, unoId: string) => setUnoId(phone, id, unoId)

  store.getJid = async (phoneOrJid: string) => {
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
    if (CLEAN_CONFIG_ON_DISCONNECT) {
      await delConfig(phone)
    }
    await delAuth(phone)
  }
  store.setStatus = async (id: string, status: MessageStatus) => {
    return setMessageStatus(phone, id, status)
  }
  store.loadStatus = async (id: string) => {
    return getMessageStatus(phone, id)
  }
  store.setTemplates = async (templates: string) => {
    return setTemplates(phone, templates)
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

      if(!ONLY_HELLO_TEMPLATE) {
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

        const parameters: object[] = []
        const config = {
          id: 4,
          name: 'unoapi-config',
          status: 'APPROVED',
          category: 'UTILITY',
          language: 'pt_BR',
          components: [
            {
              text: '',
              type: 'BODY',
              parameters,
            },
          ],
        }
        const keysToIgnore = ['getStore', 'baseStore', 'shouldIgnoreKey', 'shouldIgnoreJid', 'webhooks']
        const keys = Object.keys(defaultConfig).filter((k) => !keysToIgnore.includes(k))
        const getTypeofProperty = <T, K extends keyof T>(o: T, name: K) => typeof o[name] || 'string'
        for (const key of keys) {
          const type = getTypeofProperty(defaultConfig, key as keyof Config)
          const param: object = { type, text: key }
          parameters.push(param)
          config.components[0].text = `${key}: {{${key}}}\n${config.components[0].text}`
        }
        return [hello, bulkReport, webhook, config]
      } else {
        return [hello]
      }
      
    }
  }
  return store
}
