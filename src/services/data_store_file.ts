import {
  proto,
  WAMessage,
  WAMessageKey,
  WASocket,
  useMultiFileAuthState,
  GroupMetadata,
  isLidUser
} from 'baileys'
import { isIndividualJid, jidToPhoneNumber, phoneNumberToJid } from './transformer'
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
  const jids: Map<string, string> = new Map()
  const ids: Map<string, string> = new Map()
  const statuses: Map<string, string> = new Map()
  const medias: Map<string, string> = new Map()
  const messages: Map<string, any> = new Map()
  const groups: NodeCache = new NodeCache()
  const store = await useMultiFileAuthState(SESSION_DIR)
  const dataStore = store as DataStore
  dataStore.type = 'file'

	dataStore.loadMessage = async(jid: string, id: string) => messages.get(`${jid}-${id}`),
  dataStore.toJSON = () => {
    return {
      messages,
      keys,
      jids,
      ids,
      statuses,
      groups: groups.keys().reduce((acc, key) => {
          acc.set(key, groups.get(key))
          return acc
        }, new Map()),
      medias,
    }
  }
  dataStore.fromJSON = (json) => {
    json?.messages.entries().forEach(([key, value]) => {
      messages.set(key, value)
    })
    json?.keys.entries().forEach(([key, value]) => {
      keys.set(key, value)
    })
    json?.jids.entries().forEach(([key, value]) => {
      jids.set(key, value)
    })
    json?.ids.entries().forEach(([key, value]) => {
      jids.set(key, value)
    })
    json?.statuses.entries().forEach(([key, value]) => {
      statuses.set(key, value)
    })
    json?.groups.entries().forEach(([key, value]) => {
      groups.set(key, value, HOUR)
    })
    json?.medias.entries().forEach(([key, value]) => {
      medias.set(key, value)
    })
  }
	dataStore.writeToFile = (path: string) => {
    writeFileSync(path, JSON.stringify(dataStore.toJSON()))
  }
  dataStore.readFromFile = (path: string) => {
    const { readFileSync, existsSync } = require('fs')
    if(existsSync(path)) {
      logger.debug({ path }, 'reading from file')
      const jsonStr = readFileSync(path, { encoding: 'utf-8' })
      const json = JSON.parse(jsonStr)
      dataStore.fromJSON(json)
    }
  }
  dataStore.loadKey = async (id: string) => {
    return keys.get(id)
  }
  dataStore.setKey = async (id: string, key: WAMessageKey) => {
    return new Promise<void>((resolve) => keys.set(id, key) && resolve())
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
    const status = statuses.get(id)
    return status ? undefined : status as MessageStatus
  }

  dataStore.loadUnoId = async (id: string) =>  ids.get(id) || ids.get(`${phone}-${id}`)
  dataStore.setUnoId = async (id: string, unoId: string) => {
    ids.set(`${phone}-${id}`, unoId)
  }
  dataStore.loadJid = async (phoneOrJid: string, sock: Partial<WASocket>) => {
    if (!isIndividualJid(phoneOrJid)) {
      return phoneOrJid
    }
    let jid = await dataStore.getJid(phoneOrJid)
    let lid
    if (isLidUser(jid)) {
      lid = jid
    }
    if (!jid || lid) {
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
        if (lid) {
          logger.warn(`${phoneOrJid} not retrieve jid on WhatsApp baileys return lid ${lid}`)
          return lid
        } else {
          logger.warn(`${phoneOrJid} not exists on WhatsApp baileys onWhatsApp return results ${results ? JSON.stringify(results) : null}`)
        }
      }
    }
    return jid
  }
  dataStore.loadMediaPayload = async (id: string) => {
    const string = medias.get(id)
    return string ? JSON.parse(string) : undefined
  }
  dataStore.setMediaPayload = async (id: string, payload: string) => {
    medias.set(id, JSON.stringify(payload))
  }
  dataStore.setJid = async (phoneOrJid: string, jid: string) => {
    jids.set(phoneOrJid, jid)
  }
  dataStore.setJidIfNotFound = async (phoneOrJid: string, jid: string) => {
    if (await dataStore.getJid(jid)) {
      return
    }
    return dataStore.setJid(phoneOrJid, jid)
  }
  dataStore.getJid = async (phoneOrJid: string) => {
    return jids.get(phoneOrJid)
  }
  dataStore.setMessage = async (jid: string, message: WAMessage) => {
    messages.get(jid)?.set(`${jid}-${message?.key?.id!}`, message)
  }
  dataStore.cleanSession = async (_removeConfig = false) => {
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
