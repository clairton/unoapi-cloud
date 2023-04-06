import { makeInMemoryStore, BaileysEventEmitter, proto, Chat, Contact, WAMessage, WAMessageKey, WASocket } from '@adiwajshing/baileys'
import makeOrderedDictionary from '@adiwajshing/baileys/lib/Store/make-ordered-dictionary'
import { waMessageID } from '@adiwajshing/baileys/lib/Store/make-in-memory-store'
import { isIndividualJid, jidToPhoneNumber, phoneNumberToJid } from './transformer'
import { existsSync, readFileSync, rmSync } from 'fs'
import { DataStore } from './data_store'
import { SESSION_DIR } from './session_store_file'
import { getDataStore, dataStores } from './data_store'

export const MEDIA_DIR = './data/medias'

export const getDataStoreFile: getDataStore = (phone: string, config: object): DataStore => {
  if (!dataStores.has(phone)) {
    console.debug('Creating data store file %s', phone)
    const store = dataStoreFile(phone, config)
    dataStores.set(phone, store)
  } else {
    console.debug('Retrieving data store file %s', phone)
  }
  return dataStores.get(phone) as DataStore
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const dataStoreFile = (phone: string, config: any): DataStore => {
  const keys: Map<string, proto.IMessageKey> = new Map()
  const jids: Map<string, string> = new Map()
  const ids: Map<string, string> = new Map()
  const store = makeInMemoryStore(config)
  const dataStore = store as DataStore
  const { bind, toJSON, fromJSON } = store
  store.toJSON = () => {
    return {
      ...toJSON(),
      keys: keys.values(),
      jids,
      ids,
    }
  }
  store.fromJSON = (json) => {
    fromJSON(json)
    const jsonData = json as {
      keys: proto.IMessageKey[]
      jids: Map<string, string>
      ids: Map<string, string>
      chats: Chat[]
      contacts: { [id: string]: Contact }
      messages: { [id: string]: WAMessage[] }
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
        console.debug('chats.delete verify id: ', item)
        if (store.chats.get(item)) {
          console.debug('chats.delete delete id: ', item)
          store.chats.deleteById(item)
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
  dataStore.loadUnoId = async (id: string) => ids.get(id)
  dataStore.setUnoId = async (id: string, unoId: string) => new Promise((resolve) => ids.set(id, unoId) && resolve())
  dataStore.getJid = async (phone: string, sock: Partial<WASocket>) => {
    const phoneOrJid = phoneNumberToJid(phone)
    if (!isIndividualJid(phoneOrJid)) {
      return phoneOrJid
    }
    if (!jids.has(phone)) {
      let results = []
      try {
        console.debug(`Verifing if ${phoneOrJid} exist on WhatsApp`)
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        results = await sock.onWhatsApp!(phoneOrJid)
      } catch (_e) {
        console.error(`Error on check if ${phoneOrJid} has whatsapp`)
        if (phone === phoneOrJid) {
          const jid = phoneNumberToJid(jidToPhoneNumber(phoneOrJid))
          console.info(`${phoneOrJid} is the phone connection ${phone} returning ${jid}`)
          return jid
        }
      }
      const result = results && results[0]
      if (result && result.exists) {
        console.debug(`${phoneOrJid} exists on WhatsApp, as jid: ${result.jid}`)
        jids.set(phoneOrJid, result.jid)
      } else {
        console.warn(`${phoneOrJid} not exists on WhatsApp`)
      }
    }
    return jids.get(phoneOrJid) || ''
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
      console.info(`Clean session phone %s dir %s`, phone, sessionDir)
      return rmSync(sessionDir, { recursive: true })
    } else {
      console.info(`Already empty session phone %s dir %s`, phone, sessionDir)
    }
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
      language: 'pt_BR',
      components: [
        {
          text: 'Olá!',
          type: 'BODY',
        },
      ],
    }
    return [template]
  }
  return dataStore
}
