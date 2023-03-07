import {
  makeInMemoryStore,
  BaileysEventEmitter,
  proto,
  Chat,
  Contact,
  WAMessage,
  downloadMediaMessage,
  WAMessageUpdate,
  MessageUpsertType,
  WAMessageKey,
} from '@adiwajshing/baileys'
import makeOrderedDictionary from '@adiwajshing/baileys/lib/Store/make-ordered-dictionary'
import { waMessageID } from '@adiwajshing/baileys/lib/Store/make-in-memory-store'
import { getMessageType, TYPE_MESSAGES_TO_PROCESS_FILE } from './transformer'
import { writeFile } from 'fs/promises'
import { existsSync, mkdirSync } from 'fs'
import { DataStore } from './data_store'
import mime from 'mime-types'

const MEDIA_DIR = './data/medias'

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
export const fileDataStore = (phone: string, config: any) => {
  const keys: Map<string, proto.IMessageKey> = new Map()
  const store = makeInMemoryStore(config)
  const dataStore = store as DataStore
  const { bind, toJSON, fromJSON } = store
  store.toJSON = () => {
    return {
      ...toJSON(),
      keys: keys.values(),
    }
  }
  store.fromJSON = (json) => {
    fromJSON(json)
    const jsonData = json as {
      keys: proto.IMessageKey[]
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
    ev.on('messages.upsert', async ({ messages }: { messages: WAMessage[]; type: MessageUpsertType }) => {
      for (const msg of messages) {
        const { key } = msg
        if (key.id) {
          dataStore.setKey(key.id, key)
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
  dataStore.loadKey = (id: string) => {
    return keys.get(id)
  }
  dataStore.setKey = (id: string, key: WAMessageKey) => {
    return keys.set(id, key)
  }
  dataStore.setMessage = (id: string, message: WAMessage) => {
    if (!store.messages[id]) {
      store.messages[id] = makeOrderedDictionary(waMessageID)
    }
    console.log(store.messages)
    return store.messages[id].upsert(message, 'append')
  }
  dataStore.saveMedia = async (waMessage: WAMessage) => {
    return saveMedia(phone, waMessage)
  }
  return dataStore
}
