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
} from 'baileys'
import makeOrderedDictionary from 'baileys/lib/Store/make-ordered-dictionary'
import { BaileysInMemoryStoreConfig, waMessageID } from 'baileys/lib/Store/make-in-memory-store'
import { isIndividualJid, isSaveMedia, jidToPhoneNumber, phoneNumberToJid } from './transformer'
import { existsSync, readFileSync, rmSync, writeFileSync, mkdirSync } from 'fs'
import { DataStore, MessageStatus } from './data_store'
import { SESSION_DIR } from './session_store_file'
import { getDataStore, dataStores } from './data_store'
import { Config } from './config'
import logger from './logger'
import NodeCache from 'node-cache'
import { BASE_URL } from '../defaults'

export const MEDIA_DIR = './data/medias'
const HOUR = 60 * 60

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

const deepMerge = (obj1, obj2) => {
  const result = { ...obj1 };
  for (let key in obj2) {
    if (obj2.hasOwnProperty(key)) {
      if (obj2[key] instanceof Object && obj1[key] instanceof Object) {
        result[key] = deepMerge(obj1[key], obj2[key]);
      } else {
        result[key] = obj2[key];
      }
    }
  }
  return result;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const dataStoreFile = async (phone: string, config: Config): Promise<DataStore> => {
  const keys: Map<string, proto.IMessageKey> = new Map()
  const jids: NodeCache = new NodeCache()
  const ids: Map<string, string> = new Map()
  const statuses: Map<string, string> = new Map()
  const groups: NodeCache = new NodeCache()
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
      groups,
    }
  }
  store.fromJSON = (json) => {
    fromJSON(json)
    const jsonData = json as unknown as {
      keys: proto.IMessageKey[]
      jids: Map<string, string>
      ids: Map<string, string>
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
    const { mediaStore } = await config.getStore(phone, config)
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
    ev.on('contacts.upsert', async (contacts: Contact[]) => {
      logger.debug('contacts.upsert %s', phone, JSON.stringify(contacts))
      const { saveProfilePicture } = mediaStore
      await Promise.all(contacts.map(async (c) => {
          return saveProfilePicture(c)
        })
      )
    })
    ev.on('contacts.update', async (contacts: Partial<Contact>[]) => {
      logger.debug('contacts.update %s => %s', phone, JSON.stringify(contacts))
      const { saveProfilePicture } = mediaStore
      await Promise.all(contacts.map(async (c) => saveProfilePicture(c)))
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
    const phoneNumber = jidToPhoneNumber(jid)
    logger.debug('Retriving profile picture %s...', phoneNumber)
    const { mediaStore } = await config.getStore(phone, config)
    const url = await mediaStore.getProfilePictureUrl(BASE_URL, jid)
    logger.debug('Retrived profile picture %s!', url)
    return url
  }
  dataStore.setImageUrl = async (jid: string, url: string) => {
    logger.debug('Saving profile picture %s...', jid)
    const { mediaStore } = await config.getStore(phone, config)
    const { saveProfilePicture } = mediaStore
    await saveProfilePicture({ imgUrl: url, id: jid })
    logger.debug('Saved profile picture %s!', jid)
  }
  dataStore.loadImageUrl = async (jid: string, sock: WASocket) => {
    logger.debug('Search profile picture for %s', jid)
    let url = await dataStore.getImageUrl(jid)
    if (!url) {
      logger.debug('Get profile picture in socket for %s', jid)
      url = await sock.profilePictureUrl(jid)
      if (url) {
        await dataStore.setImageUrl(jid, url)
      }
    }
    logger.debug('Found %s profile picture for %s', url, jid)
    return url
  }

  dataStore.getGroupMetada = async (jid: string) => {
    return groups.get(jid)
  }
  dataStore.setGroupMetada = async (jid: string, data: GroupMetadata) => {
    groups.set(jid, data, HOUR)
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

  dataStore.setStatus = async (id: string, status: MessageStatus) => {
    statuses.set(id, status)
  }
  dataStore.loadStatus = async (id: string) => {
    return statuses.get(id)
  }

  dataStore.loadUnoId = async (id: string) => ids.get(id)
  dataStore.setUnoId = async (id: string, unoId: string) => {
    ids.set(id, unoId)
  }
  dataStore.loadJid = async (phoneOrJid: string, sock: Partial<WASocket>) => {
    if (!isIndividualJid(phoneOrJid)) {
      return phoneOrJid
    }
    let jid = await dataStore.getJid(phoneOrJid)
    if (!jid) {
      let results: unknown
      try {
        logger.debug(`Verifing if ${phoneOrJid} exist on WhatsApp`)
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        results = await sock?.onWhatsApp!(phoneOrJid)
      } catch (e) {
        logger.error(e, `Error on check if ${phoneOrJid} has whatsapp`)
        try {
          if (jidToPhoneNumber(phone) === jidToPhoneNumber(phoneOrJid)) {
            jid = phoneNumberToJid(phone)
            logger.info(`${phone} is the phone connection ${phone} returning ${jid}`)
            return jid
          } else if ('status@broadcast' == phoneOrJid) {
            return phoneOrJid
          }
        } catch (error) {
          
        }
      }
      const result = results && results[0]
      const test = result && result?.exists && result?.jid
      logger.debug(`${phoneOrJid} found onWhatsApp exists: ${result?.exists} jid: ${result?.jid} test: ${test}`)
      if (test) {
        logger.debug(`${phoneOrJid} exists on WhatsApp, as jid: ${result.jid}`)
        jid = result.jid
        await dataStore.setJid(phoneOrJid, jid!)
      } else {
        logger.warn(`${phoneOrJid} not exists on WhatsApp baileys onWhatsApp return results ${results ? JSON.stringify(results) : null}`)
      }
    }
    return jid
  }
  dataStore.setJid = async (phoneOrJid: string, jid: string) => {
    jids.set(phoneOrJid, jid, HOUR)
  }
  dataStore.getJid = async (phoneOrJid: string) => {
    return jids.get(phoneOrJid)
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
    const sessionDir = `${SESSION_DIR}/${phone}`
    const templateFile = `${sessionDir}/templates.json`
    let newTemplates = templates
    if (!existsSync(sessionDir)) {
      mkdirSync(sessionDir, { recursive: true })
    } else {
      const currentTemplates = dataStore.loadTemplates()
      newTemplates = deepMerge(currentTemplates, templates)
    }
    return writeFileSync(templateFile, JSON.stringify(newTemplates))
  }
  dataStore.loadTemplates = async () => {
    const templateFile = `${SESSION_DIR}/${phone}/templates.json`
    if (existsSync(templateFile)) {
      const string = readFileSync(templateFile)
      if (string) {
        return JSON.parse(string.toString())
      }
    }
    const template = {
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

    return [template]
  }
  return dataStore
}
