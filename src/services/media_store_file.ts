import { proto, WAMessage, downloadMediaMessage, Contact } from 'baileys'
import { getBinMessage, getMessageType, jidToPhoneNumberIfUser, toBuffer } from './transformer'
import { writeFile } from 'fs/promises'
import { existsSync, mkdirSync, rmSync } from 'fs'
import { MediaStore, getMediaStore, mediaStores } from './media_store'
import mime from 'mime-types'
import { Response } from 'express'
import { getDataStore } from './data_store'
import { Config } from './config'
import logger from './logger'
import { DATA_URL_TTL, FETCH_TIMEOUT_MS } from '../defaults'
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

  const mediaStore: MediaStore = {} as MediaStore
  mediaStore.type = 'file'

  mediaStore.getFileName = (phone: string, waMessage: proto.IWebMessageInfo) => {
    const { key } = waMessage
    const binMessage = getBinMessage(waMessage)
    if (binMessage?.message?.mimetype) {
      const extension = mime.extension(binMessage?.message?.mimetype)
      return `${phone}/${key.id}.${extension}`
    }
    throw 'Not possible get file name'
  }

  mediaStore.getFileUrl = async (fileName: string, _expiresIn = DATA_URL_TTL) => {
    return `${config.baseStore}${MEDIA_DIR}/${fileName}`
  }

  mediaStore.getDownloadUrl = async (baseUrl: string, filePath: string) => {
    return `${baseUrl}/v15.0/download/${filePath}`
  }

  mediaStore.saveMedia = async (waMessage: WAMessage) => {
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
    const fileName = mediaStore.getFileName(phone, waMessage)
    await mediaStore.saveMediaBuffer(fileName, buffer)
    if (binMessage?.messageType && waMessage.message) {
      waMessage.message[binMessage?.messageType]['url'] = await mediaStore.getFileUrl(fileName, DATA_URL_TTL)
    }
    return waMessage
  }

  mediaStore.saveMediaBuffer = async (fileName: string, content: Buffer) => {
    const filePath = await mediaStore.getFileUrl(fileName, DATA_URL_TTL)
    const parts = filePath.split('/')
    const dir: string = parts.splice(0, parts.length - 1).join('/')
    if (!existsSync(dir)) {
      mkdirSync(dir)
    }
    await writeFile(filePath, content)
    return true
  }

  mediaStore.removeMedia = async (fileName: string) => {
    const filePath = await mediaStore.getFileUrl(fileName, DATA_URL_TTL)
    return rmSync(filePath)
  }

  mediaStore.downloadMedia = async (res: Response, file: string) => {
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
    const filePath = await mediaStore.getFileUrl(`${phone}/${file}`, DATA_URL_TTL)
    res.contentType(mime.lookup(filePath) || '')
    res.download(filePath, fileName)
  }

  mediaStore.getMedia = async (baseUrl: string, mediaId: string) => {
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
            const filePath = await mediaStore.getFileName(phone, message)
            const mimeType = mime.lookup(filePath)
            const url = await mediaStore.getDownloadUrl(baseUrl, filePath)
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

  mediaStore.getProfilePictureUrl = async (baseUrl: string, jid: string) => {
    const phoneNumber = jidToPhoneNumberIfUser(jid)
    const base = await mediaStore.getFileUrl(PROFILE_PICTURE_FOLDER, DATA_URL_TTL)
    const fName = profilePictureFileName(phoneNumber)
    const complete = `${base}/${fName}`
    return existsSync(complete) ? `${baseUrl}/v15.0/download/${phone}/${PROFILE_PICTURE_FOLDER}/${fName}` : undefined
  }

  mediaStore.saveProfilePicture = async (contact: Contact) => {
    const phoneNumber = jidToPhoneNumberIfUser(contact.id)
    const fName = profilePictureFileName(contact.id)
    if (['changed', 'removed'].includes(contact.imgUrl || '')) {
      logger.debug('Removing profile picture file %s...', phoneNumber)
      await mediaStore.removeMedia(`${PROFILE_PICTURE_FOLDER}/${fName}`)
    } else if (contact.imgUrl) {
      const base = await mediaStore.getFileUrl(PROFILE_PICTURE_FOLDER, DATA_URL_TTL)
      const complete = `${base}/${fName}`
      logger.debug('Saving profile picture file %s....', phoneNumber)
      if (!existsSync(base)) {
        mkdirSync(base, { recursive: true })
      }
      const response: FetchResponse = await fetch(contact.imgUrl, { signal: AbortSignal.timeout(FETCH_TIMEOUT_MS), method: 'GET'})
      const buffer = toBuffer(await response.arrayBuffer())
      await writeFile(complete, buffer)
      logger.debug('Saved profile picture file %s!!', phoneNumber)
    }
  }

  return mediaStore
}
