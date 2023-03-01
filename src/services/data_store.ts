import { makeInMemoryStore, BaileysEventEmitter, proto, Chat, Contact, WAMessage, downloadMediaMessage } from '@adiwajshing/baileys'
import { getMessageType, TYPE_MESSAGES_TO_PROCESS_FILE } from './transformer'
import { writeFile } from 'fs/promises'

export type DataStore = ReturnType<typeof makeInMemoryStore> & {
  loadKey: (id: string) => proto.IMessageKey | undefined
}

export const getFileName = async (waMessage: WAMessage) => {
  const { message, key } = waMessage
  if (message) {
    const mediaMessage = getMediaValue(message)
    if (mediaMessage?.mimetype) {
      const contentType = mediaMessage?.mimetype.split(';')[0]
      const extension = contentType.split('/')[1]
      return `./data/files/${key.id}.${extension}`
    }
  }
  throw 'Not possible get file'
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

const saveMedia = async (waMessage: WAMessage) => {
  const messageType = getMessageType(waMessage)
  if (TYPE_MESSAGES_TO_PROCESS_FILE.includes(messageType)) {
    const buffer = await downloadMediaMessage(waMessage, 'buffer', {})
    const fileName = await getFileName(waMessage)
    await writeFile(fileName, buffer)
  }
}

export const dataStore = (config: any) => {
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
    ev.on('messages.upsert', async ({ messages: newMessages }) => {
      for (const msg of newMessages) {
        await saveMedia(msg)
        const { key } = msg
        const id: any = key.id
        keys.set(id, key)
      }
    })
    ev.on('messages.update', (update: any) => {
      const { key } = update
      const id: any = key.id
      keys.set(id, key)
    })
  }
  const dataStore = store as DataStore
  dataStore.loadKey = (id: string) => {
    return keys.get(id)
  }
  return dataStore
}
