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
} from '@adiwajshing/baileys'
import { getMessageType, TYPE_MESSAGES_TO_PROCESS_FILE } from './transformer'
import { writeFile } from 'fs/promises'
import { DataStore } from './data_store'

const MEDIA_DIR = './data/files'

export const getFileName = async (waMessage: proto.IWebMessageInfo) => {
  const { message, key } = waMessage
  if (message) {
    const mediaMessage = getMediaValue(message)
    if (mediaMessage?.mimetype) {
      const contentType = mediaMessage?.mimetype.split(';')[0]
      const extension = contentType.split('/')[1]
      return `${key.id}.${extension}`
    }
  }
  throw 'Not possible get file name'
}

const getFilePatByMessage = async (phone: string, waMessage: proto.IWebMessageInfo) => {
  return getFilePath(phone, await getFileName(waMessage))
}

export const getFilePath = async (phone: string, fileName: string) => {
  return `${MEDIA_DIR}/${phone}/${fileName}`
}

type MessageUpdate = {
  messages: WAMessage[]
  type: MessageUpsertType
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

const saveMedia = async (phone: string, waMessage: proto.IWebMessageInfo) => {
  const messageType = getMessageType(waMessage)
  if (TYPE_MESSAGES_TO_PROCESS_FILE.includes(messageType)) {
    const buffer = await downloadMediaMessage(waMessage, 'buffer', {})
    const filePath = await getFilePatByMessage(phone, waMessage)
    await writeFile(filePath, buffer)
  }
}

export const fileDataStore = (phone: string, config: any) => {
  const keys: Map<string, proto.IMessageKey> = new Map()
  const store = makeInMemoryStore(config)
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
    ev.on('messages.upsert', async (messages: MessageUpdate) => {
      for (const msg of messages.messages) {
        await saveMedia(phone, msg)
        const { key } = msg
        if (key.id) {
          keys.set(key.id, key)
        }
      }
    })
    ev.on('messages.update', (updates: WAMessageUpdate[]) => {
      for (const update of updates) {
        const {
          key: { id },
        } = update
        if (id) {
          keys.set(id, update.key)
        }
      }
    })
  }
  const dataStore = store as DataStore
  dataStore.loadKey = (id: string) => {
    return keys.get(id)
  }
  return dataStore
}
