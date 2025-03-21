import { WAMessage } from 'baileys'
import { getDataStore } from './data_store'
import { amqpPublish } from '../amqp'
import { UNOAPI_QUEUE_MEDIA, DATA_TTL, UNOAPI_EXCHANGE_BROKER_NAME } from '../defaults'
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
    const i = await saveMedia(waMessage)
    if (i) {
      const fileName = mediaStore.getFileName(phone, waMessage)
      await amqpPublish(UNOAPI_EXCHANGE_BROKER_NAME, UNOAPI_QUEUE_MEDIA, phone, { fileName: fileName }, { delay: DATA_TTL * 1000 })
    }
    return i
  }
  return mediaStore
}
