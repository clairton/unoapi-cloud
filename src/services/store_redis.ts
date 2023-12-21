import { AuthenticationState } from '@whiskeysockets/baileys'
import { sessionRedis } from './session_redis'
import { authState } from './auth_state'
import { store, Store } from './store'
import { DataStore } from './data_store'
import { getDataStoreRedis } from './data_store_redis'
import { MEDIA_DIR } from './data_store_file'
import { getStore, stores } from './store'
import { getMediaStoreS3 } from './media_store_s3'
import { MediaStore } from './media_store'
import { Config } from './config'
import logger from './logger'

export const getStoreRedis: getStore = async (phone: string, config: Config): Promise<Store> => {
  if (!stores.has(phone)) {
    logger.debug('Creating redis store %s', phone)
    const fstore: Store = await storeRedis(phone, config)
    stores.set(phone, fstore)
  } else {
    logger.debug('Retrieving redis store %s', phone)
  }
  return stores.get(phone) as Store
}

const storeRedis: store = async (phone: string, config: Config): Promise<Store> => {
  const mediaDir = `${MEDIA_DIR}/${phone}`
  logger.info(`Store session: ${phone}`)
  logger.info(`Store medias in directory: ${mediaDir}`)
  const { state, saveCreds }: { state: AuthenticationState; saveCreds: () => Promise<void> } = await authState(sessionRedis, phone)
  const dataStore: DataStore = await getDataStoreRedis(phone, config)
  const mediaStore: MediaStore = getMediaStoreS3(phone, config, getDataStoreRedis) as MediaStore
  logger.info(`Store data in redis`)
  return { state, saveCreds, dataStore, mediaStore }
}
