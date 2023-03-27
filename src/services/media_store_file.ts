import { proto, WAMessage, downloadMediaMessage } from '@adiwajshing/baileys'
import { getMessageType, TYPE_MESSAGES_TO_PROCESS_FILE } from './transformer'
import { writeFile } from 'fs/promises'
import { existsSync, mkdirSync, rmSync } from 'fs'
import { MediaStore, getMediaStore, mediaStores } from './media_store'
import mime from 'mime-types'
import { Response } from 'express'
import { getDataStore } from './data_store'

export const MEDIA_DIR = './data/medias'

export const getMediaStoreFile: getMediaStore = (phone: string, config: object, getDataStore: getDataStore): MediaStore => {
  if (!mediaStores.has(phone)) {
    console.debug('Creating file data store %s', phone)
    const store = mediaStoreFile(phone, config, getDataStore)
    mediaStores.set(phone, store)
  } else {
    console.debug('Retrieving file data store %s', phone)
  }
  return mediaStores.get(phone) as MediaStore
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
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const mediaStoreFile = (phone: string, config: object, getDataStore: getDataStore): MediaStore => {
  const saveMedia = async (waMessage: WAMessage) => {
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
      return true
    }
    return false
  }
  const removeMedia = async (fileName: string) => {
    const filePath = getFilePath(fileName)
    return rmSync(filePath)
  }
  const downloadMedia = async (res: Response, file: string) => {
    const store = await getDataStore(phone, config)
    const mediaId = file.split('.')[0]
    let fileName = ''
    if (mediaId) {
      const key: proto.IMessageKey | undefined = await store.loadKey(mediaId)
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

  const getMedia = async (baseUrl: string, mediaId: string) => {
    const store = await getDataStore(phone, config)
    if (mediaId) {
      const key: proto.IMessageKey | undefined = await store.loadKey(mediaId)
      console.debug('key %s for %s', key, mediaId)
      if (key) {
        const { remoteJid, id } = key
        if (remoteJid && id) {
          const message = await store.loadMessage(remoteJid, id)
          console.debug('message %s for %s', message, key)
          if (message) {
            const messageType = getMessageType(message)
            const binMessage = message.message[messageType]
            const filePath = await getFileName(phone, message)
            const mimeType = mime.lookup(filePath)
            const url = `${baseUrl}/v15.0/download/${filePath}`
            return {
              messaging_product: 'whatsapp',
              url,
              mime_type: mimeType,
              sha256: binMessage.fileSha256,
              file_size: binMessage.fileLength,
              id: `${phone}/${id}`,
            }
          }
        }
      }
    }
  }
  return { saveMedia, removeMedia, downloadMedia, getMedia }
}
