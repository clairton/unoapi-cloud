import { proto, WAMessage, downloadMediaMessage, Contact } from 'baileys'
import { getBinMessage, getMessageType, toBuffer } from './transformer'
import { writeFile } from 'fs/promises'
import { existsSync, mkdirSync, rmSync } from 'fs'
import { MediaStore, getMediaStore, mediaStores } from './media_store'
import mime from 'mime-types'
import { Response } from 'express'
import { getDataStore } from './data_store'
import { Config } from './config'
import logger from './logger'
import { FETCH_TIMEOUT_MS } from '../defaults'
import fetch, { Response as FetchResponse } from 'node-fetch'

export const MEDIA_DIR = '/medias'

export const getMediaStoreFile: getMediaStore = (phone: string, config: Config, getDataStore: getDataStore): MediaStore => {
  if (!mediaStores.has(phone)) {
    logger.debug('Creating media store file %s', phone)
    const store = mediaStoreFile(phone, config, getDataStore)
    mediaStores.set(phone, store)
  } else {
    logger.debug('Retrieving media store file %s', phone)
  }
  return mediaStores.get(phone) as MediaStore
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const mediaStoreFile = (phone: string, config: Config, getDataStore: getDataStore): MediaStore => {
  const PROFILE_PICTURE_FOLDER = 'profile-pictures'
  const profilePictureFileName = (phone) => `${phone}.jpg`

  const getFileName = (phone: string, waMessage: proto.IWebMessageInfo) => {
    const { key } = waMessage
    const binMessage = getBinMessage(waMessage)
    if (binMessage?.message?.mimetype) {
      const extension = mime.extension(binMessage?.message?.mimetype)
      return `${phone}/${key.id}.${extension}`
    }
    throw 'Not possible get file name'
  }

  const getFileUrl = async (fileName: string) => {
    return `${config.baseStore}${MEDIA_DIR}/${fileName}`
  }

  const getDownloadUrl = async (baseUrl: string, filePath: string) => {
    return `${baseUrl}/v15.0/download/${filePath}`
  }

  const saveMedia = async (waMessage: WAMessage) => {
    let buffer
    const binMessage = getBinMessage(waMessage)
    const url = binMessage?.message?.url
    if (url.indexOf('base64') >= 0) {
      const parts = url.split(',')
      const base64 = parts[1]
      buffer = Buffer.from(base64, 'base64')
    } else {
      buffer = await downloadMediaMessage(waMessage, 'buffer', {})
    }
    const fileName = getFileName(phone, waMessage)
    await saveMediaBuffer(fileName, buffer)
    if (binMessage?.messageType && waMessage.message) {
      waMessage.message[binMessage?.messageType]['url'] = await getFileUrl(fileName)
    }
    return waMessage
  }

  const saveMediaBuffer = async (fileName: string, content: Buffer) => {
    const filePath = await getFileUrl(fileName)
    const parts = filePath.split('/')
    const dir: string = parts.splice(0, parts.length - 1).join('/')
    if (!existsSync(dir)) {
      mkdirSync(dir)
    }
    await writeFile(filePath, content)
    return true
  }

  const removeMedia = async (fileName: string) => {
    const filePath = await getFileUrl(fileName)
    return rmSync(filePath)
  }

  const downloadMedia = async (res: Response, file: string) => {
    const store = await getDataStore(phone, config)
    const mediaId = file.split('.')[0]
    let fileName = ''
    if (mediaId) {
      const key: proto.IMessageKey | undefined = await store.loadKey(mediaId)
      logger.debug('key %s for %s', JSON.stringify(key), mediaId)
      if (key) {
        const { remoteJid, id } = key
        if (remoteJid && id) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const message: any = await store.loadMessage(remoteJid, id)
          logger.debug('message %s for %s', JSON.stringify(message), JSON.stringify(key))
          if (message) {
            const messageType = getMessageType(message)
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const binMessage: any = message.message && messageType && message.message[messageType]
            fileName = binMessage.fileName
          }
        }
      }
    }
    const filePath = await getFileUrl(`${phone}/${file}`)
    res.contentType(mime.lookup(filePath) || '')
    res.download(filePath, fileName)
  }

  const getMedia = async (baseUrl: string, mediaId: string) => {
    const store = await getDataStore(phone, config)
    if (mediaId) {
      const key: proto.IMessageKey | undefined = await store.loadKey(mediaId)
      logger.debug('key %s for %s', JSON.stringify(key), mediaId)
      if (key) {
        const { remoteJid, id } = key
        if (remoteJid && id) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const message: any = await store.loadMessage(remoteJid, id)
          logger.debug('message %s for %s', JSON.stringify(message), JSON.stringify(key))
          if (message) {
            const binMessage = getBinMessage(message)
            const filePath = await getFileName(phone, message)
            const mimeType = mime.lookup(filePath)
            const url = await getDownloadUrl(baseUrl, filePath)
            return {
              messaging_product: 'whatsapp',
              url,
              mime_type: mimeType,
              sha256: binMessage?.message?.fileSha256,
              file_size: binMessage?.message?.fileLength,
              id: `${phone}/${id}`,
            }
          }
        }
      }
    }
  }

  const getProfilePictureUrl = async (baseUrl: string, phoneNumber: string) => {
    const base = await getFileUrl(PROFILE_PICTURE_FOLDER)
    const fName = profilePictureFileName(phoneNumber)
    const complete = `${base}/${fName}`
    return existsSync(complete) ? `${baseUrl}/v15.0/download/${phone}/${PROFILE_PICTURE_FOLDER}/${fName}` : undefined
  }

  const saveProfilePicture = async (contact: Contact) => {
    const base = await getFileUrl(PROFILE_PICTURE_FOLDER)
    const fName = profilePictureFileName(contact.id)
    const complete = `${base}/${fName}`
    if (contact.imgUrl == 'changed') {
      logger.debug('Removing profile picture file %s...', contact.id)
      await removeMedia(complete)
    } else if (contact.imgUrl) {
      logger.debug('Saving profile picture file %s....', contact.id)
      if (!existsSync(base)) {
        mkdirSync(base)
      }
      const response: FetchResponse = await fetch(contact.imgUrl, { signal: AbortSignal.timeout(FETCH_TIMEOUT_MS), method: 'GET'})
      const buffer = toBuffer(await response.arrayBuffer())
      await writeFile(complete, buffer)
      logger.debug('Saved profile picture file %s!!', contact.id)
    }
  }

  return { saveMedia, removeMedia, downloadMedia, getMedia, getFileName, saveMediaBuffer, getFileUrl, getDownloadUrl, getProfilePictureUrl, saveProfilePicture }
}
