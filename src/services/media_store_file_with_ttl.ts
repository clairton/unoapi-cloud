import { WAMessage } from '@whiskeysockets/baileys'
import { getDataStore } from './data_store'
import { amqpEnqueue } from '../amqp'
import { UNOAPI_JOB_MEDIA, DATA_TTL } from '../defaults'
import { getMediaStore, MediaStore, mediaStores } from './media_store'
import { mediaStoreFile } from './media_store_file'
import { Config } from './config'
import logger from './logger'

export const getMediaStoreFileWithTTL: getMediaStore = (phone: string, config: Config, getDataStore: getDataStore): MediaStore => {
  if (!mediaStores.has(phone)) {
    logger.debug('Creating file data store %s', phone)
    const store = mediaStoreFileWithTTL(phone, config, getDataStore)
    mediaStores.set(phone, store)
  } else {
    logger.debug('Retrieving file data store %s', phone)
  }
  return mediaStores.get(phone) as MediaStore
}

const mediaStoreFileWithTTL = (phone: string, config: Config, getDataStore: getDataStore): MediaStore => {
  const mediaStore = mediaStoreFile(phone, config, getDataStore)
  const saveMedia = mediaStore.saveMedia
  mediaStore.saveMedia = async (waMessage: WAMessage) => {
    if (await saveMedia(waMessage)) {
      const fileName = mediaStore.getFileName(phone, waMessage)
      await amqpEnqueue(UNOAPI_JOB_MEDIA, phone, { phone, fileName: fileName }, { delay: DATA_TTL * 1000 })
      return true
    }
    return false
  }
  return mediaStore
}
