import {
  makeInMemoryStore,
  BaileysEventEmitter,
  proto,
  Chat,
  Contact,
  WAMessage,
  downloadMediaMessage,
  WAMessageKey,
  WASocket,
} from '@adiwajshing/baileys'
import makeOrderedDictionary from '@adiwajshing/baileys/lib/Store/make-ordered-dictionary'
import { waMessageID } from '@adiwajshing/baileys/lib/Store/make-in-memory-store'
import { getMessageType, isIndividualJid, jidToPhoneNumber, phoneNumberToJid, TYPE_MESSAGES_TO_PROCESS_FILE } from './transformer'
import { writeFile } from 'fs/promises'
import { existsSync, mkdirSync, rmSync } from 'fs'
import { DataStore } from './data_store'
import { SESSION_DIR } from './session_store_file'
import mime from 'mime-types'
import { getDataStore, dataStores } from './data_store'
import { Response } from 'express'

export const MEDIA_DIR = './data/medias'

export const getDataStoreFile: getDataStore = (phone: string, config: object): DataStore => {
  if (!dataStores.has(phone)) {
    console.debug('Creating file data store %s', phone)
    const store = dataStoreFile(phone, config)
    dataStores.set(phone, store)
  } else {
    console.debug('Retrieving file data store %s', phone)
  }
  return dataStores.get(phone) as DataStore
}

export const getFileName = (phone: string, waMessage: proto.IWebMessageInfo) => {
  const { message, key } = waMessage
  if (message) {
    const mediaMessage = getMediaValue(message)
    if (mediaMessage?.mimetype) {
      const extension = mime.extension(mediaMessage?.mimetype)
      return `${phone}/${key.id}.${extension}`
    }
  }
  throw 'Not possible get file name'
}

export const getFilePath = (fileName: string) => {
  return `${MEDIA_DIR}/${fileName}`
}

function getMediaValue(
  message: proto.IMessage,
):
  | proto.Message.IImageMessage
  | proto.Message.IVideoMessage
  | proto.Message.IAudioMessage
  | proto.Message.IDocumentMessage
  | proto.Message.IStickerMessage
  | undefined {
  return (
    message?.stickerMessage ||
    message?.imageMessage ||
    message?.videoMessage ||
    message?.audioMessage ||
    message?.documentMessage ||
    message?.stickerMessage ||
    undefined
  )
}

const saveMedia = async (phone: string, waMessage: WAMessage) => {
  const messageType = getMessageType(waMessage)
  if (messageType && TYPE_MESSAGES_TO_PROCESS_FILE.includes(messageType)) {
    let buffer
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const anyM: any = waMessage
    const url = anyM.message[messageType].url
    if (url.indexOf('base64') >= 0) {
      const parts = url.split(',')
      const base64 = parts[1]
      buffer = Buffer.from(base64, 'base64')
    } else {
      buffer = await downloadMediaMessage(waMessage, 'buffer', {})
    }
    const fileName = getFileName(phone, waMessage)
    const filePath = getFilePath(fileName)
    const parts = filePath.split('/')
    const dir: string = parts.splice(0, parts.length - 1).join('/')
    if (!existsSync(dir)) {
      mkdirSync(dir)
    }
    await writeFile(filePath, buffer)
  }
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
  dataStore.setMessage = async (id: string, message: WAMessage) => {
    if (!store.messages[id]) {
      store.messages[id] = makeOrderedDictionary(waMessageID)
    }
    store.messages[id].upsert(message, 'append')
  }
  dataStore.saveMedia = async (waMessage: WAMessage) => {
    return saveMedia(phone, waMessage)
  }
  dataStore.removeMedia = async (fileName: string) => {
    const filePath = `${phone}/${fileName}`
    return rmSync(filePath)
  }
  dataStore.downloadMedia = async (res: Response, file: string) => {
    const mediaId = file.split('.')[0]
    let fileName = ''
    if (mediaId) {
      const key: proto.IMessageKey | undefined = await loadKey(mediaId)
      console.debug('key %s for %s', key, mediaId)
      if (key) {
        const { remoteJid, id } = key
        if (remoteJid && id) {
          const message = await store.loadMessage(remoteJid, id)
          console.debug('message %s for %s', message, key)
          if (message) {
            const messageType = getMessageType(message)
            const binMessage = message.message[messageType]
            fileName = binMessage.fileName
          }
        }
      }
    }
    const filePath = getFilePath(`${phone}/${file}`)
    res.contentType(mime.lookup(filePath) || '')
    res.download(filePath, fileName)
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
  return dataStore
}
