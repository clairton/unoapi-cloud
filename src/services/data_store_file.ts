import {
  makeInMemoryStore,
  BaileysEventEmitter,
  proto,
  Chat,
  Contact,
  WAMessage,
  WAMessageKey,
  WASocket,
  MessageUpsertType,
  WAMessageUpdate,
  GroupMetadata,
  isJidGroup,
} from '@whiskeysockets/baileys'
import makeOrderedDictionary from '@whiskeysockets/baileys/lib/Store/make-ordered-dictionary'
import { BaileysInMemoryStoreConfig, waMessageID } from '@whiskeysockets/baileys/lib/Store/make-in-memory-store'
import { isSaveMedia, jidToPhoneNumber, phoneNumberToJid } from './transformer'
import { existsSync, readFileSync, rmSync, writeFileSync } from 'fs'
import { DataStore } from './data_store'
import { SESSION_DIR } from './session_store_file'
import { getDataStore, dataStores } from './data_store'
import { Config } from './config'
import logger from './logger'

export const MEDIA_DIR = './data/medias'

export const getDataStoreFile: getDataStore = async (phone: string, config: Config): Promise<DataStore> => {
  if (!dataStores.has(phone)) {
    logger.debug('Creating data store file %s', phone)
    const store = await dataStoreFile(phone, config)
    dataStores.set(phone, store)
  } else {
    logger.debug('Retrieving data store file %s', phone)
  }
  return dataStores.get(phone) as DataStore
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const dataStoreFile = async (phone: string, config: Config): Promise<DataStore> => {
  const keys: Map<string, proto.IMessageKey> = new Map()
  const jids: Map<string, string> = new Map()
  const ids: Map<string, string> = new Map()
  const statuses: Map<string, string> = new Map()
  const groups: Map<string, GroupMetadata> = new Map()
  const images: Map<string, string> = new Map()
  const baileysInMemoryStoreConfig: BaileysInMemoryStoreConfig = { logger }
  const store = makeInMemoryStore(baileysInMemoryStoreConfig)
  const dataStore = store as DataStore
  const { bind, toJSON, fromJSON } = store
  store.toJSON = () => {
    return {
      ...toJSON(),
      keys: keys.values(),
      jids,
      ids,
      statuses,
      images,
      groups,
    }
  }
  store.fromJSON = (json) => {
    fromJSON(json)
    const jsonData = json as unknown as {
      keys: proto.IMessageKey[]
      jids: Map<string, string>
      ids: Map<string, string>
      images: Map<string, string>
      statuses: Map<string, string>
      chats: Chat[]
      contacts: { [id: string]: Contact }
      groups: { [id: string]: GroupMetadata }
      messages: { [id: string]: WAMessage }
    }
    if (jsonData?.keys) {
      keys.forEach((k: proto.IMessageKey) => {
        if (k && k.id) {
          keys.set(k.id, k)
        }
      })
    }
  }
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
          if (isSaveMedia(msg)) {
            const { mediaStore } = await config.getStore(phone, config)
            await mediaStore.saveMedia(msg)
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
  const loadKey = async (id: string) => {
    return keys.get(id)
  }
  dataStore.loadKey = loadKey
  dataStore.setKey = async (id: string, key: WAMessageKey) => {
    return new Promise((resolve) => keys.set(id, key) && resolve())
  }
  dataStore.getImageUrl = async (jid: string) => {
    return images.get(jid)
  }
  dataStore.setImageUrl = async (jid: string, url: string) => {
    images.set(jid, url)
  }
  dataStore.loadImageUrl = async (jid: string, sock: WASocket) => {
    let url = await dataStore.getImageUrl(jid)
    if (!url) {
      url = await sock.profilePictureUrl(jid)
      if (url) {
        await dataStore.setImageUrl(jid, url)
      }
    }
    return url
  }

  dataStore.getGroupMetada = async (jid: string) => {
    return groups.get(jid)
  }
  dataStore.setGroupMetada = async (jid: string, data: GroupMetadata) => {
    groups.set(jid, data)
  }
  dataStore.loadGroupMetada = async (jid: string, sock: WASocket) => {
    let data = await dataStore.getGroupMetada(jid)
    if (!data) {
      data = await sock.groupMetadata(jid)
      if (data) {
        await dataStore.setGroupMetada(jid, data)
      }
    }
    return data
  }

  dataStore.setStatus = async (
    id: string,
    status:
      | 'scheduled'
      | 'pending'
      | 'without-whatsapp'
      | 'invalid-phone-number'
      | 'error'
      | 'failed'
      | 'sent'
      | 'delivered'
      | 'read'
      | 'played'
      | 'accepted'
      | 'deleted',
  ) => {
    statuses.set(id, status)
  }
  dataStore.loadStatus = async (id: string) => {
    return statuses.get(id)
  }

  dataStore.loadUnoId = async (id: string) => ids.get(id)
  dataStore.setUnoId = async (id: string, unoId: string) => {
    ids.set(id, unoId)
  }
  dataStore.loadJid = async (phoneOrJid: string) => {
    return jids.get(phoneOrJid)
  }
  dataStore.setJid = async (phoneOrJid: string, jid: string) => {
    jids.set(phoneOrJid, jid)
  }
  dataStore.getJid = async (phoneOrJid: string, sock: Partial<WASocket>) => {
    if (isJidGroup(phoneOrJid)) {
      return phoneOrJid
    }
    if (!(await dataStore.loadJid(phoneOrJid))) {
      let results: unknown
      try {
        logger.debug(`Verifing if ${phoneOrJid} exist on WhatsApp`)
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        results = await sock.onWhatsApp!(phoneOrJid)
      } catch (e) {
        logger.error(e, `Error on check if ${phoneOrJid} has whatsapp`)
        if (phone === phoneOrJid) {
          const jid = phoneNumberToJid(jidToPhoneNumber(phoneOrJid))
          logger.info(`${phoneOrJid} is the phone connection ${phone} returning ${jid}`)
          return jid
        }
      }
      const result = results && Array.isArray(results) && results[0]
      if (result && result.exists) {
        logger.debug(`${phoneOrJid} exists on WhatsApp, as jid: ${result.jid}`)
        await dataStore.setJid(phoneOrJid, result.jid)
      } else {
        logger.warn(`${phoneOrJid} not exists on WhatsApp`)
      }
    }
    return dataStore.loadJid(phoneOrJid)
  }
  dataStore.setMessage = async (jid: string, message: WAMessage) => {
    if (!store.messages[jid]) {
      store.messages[jid] = makeOrderedDictionary(waMessageID)
    }
    store.messages[jid].upsert(message, 'append')
  }
  dataStore.cleanSession = async () => {
    const sessionDir = `${SESSION_DIR}/${phone}`
    if (existsSync(sessionDir)) {
      logger.info(`Clean session phone %s dir %s`, phone, sessionDir)
      return rmSync(sessionDir, { recursive: true })
    } else {
      logger.info(`Already empty session phone %s dir %s`, phone, sessionDir)
    }
  }
  dataStore.setTemplates = async (templates: string) => {
    const templateFile = `${SESSION_DIR}/${phone}/templates.json`
    return writeFileSync(templateFile, templates)
  }
  dataStore.loadTemplates = async () => {
    const templateFile = `${SESSION_DIR}/${phone}/templates.json`
    if (existsSync(templateFile)) {
      const string = readFileSync(templateFile)
      if (string) {
        return JSON.parse(string.toString())
      }
    }
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

    return [hello, bulkReport, webhook]
  }
  return dataStore
}
