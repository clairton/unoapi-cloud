import { AuthenticationState } from '@whiskeysockets/baileys'
import { sessionRedis } from './session_redis'
import { authState } from './auth_state'
import { store, Store } from './store'
import { DataStore } from './data_store'
import { getDataStoreRedis } from './data_store_redis'
import { getStore, stores } from './store'
import { getMediaStoreS3 } from './media_store_s3'
import { MediaStore } from './media_store'
import { Config } from './config'
import logger from './logger'
import { SessionStoreRedis } from './session_store_redis'
import { getMediaStoreFile } from './media_store_file'

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
  logger.info(`Store session: ${phone}`)
  const { state, saveCreds }: { state: AuthenticationState; saveCreds: () => Promise<void> } = await authState(sessionRedis, phone)
  const dataStore: DataStore = await getDataStoreRedis(phone, config)
  let mediaStore: MediaStore
  if (config.useS3) {
    mediaStore = getMediaStoreS3(phone, config, getDataStoreRedis) as MediaStore
    logger.info(`Store media in s3`)
  } else {
    mediaStore = getMediaStoreFile(phone, config, getDataStoreRedis) as MediaStore
    logger.info(`Store media in system file`)
  }
  logger.info(`Store data in redis`)
  const sessionStore = new SessionStoreRedis()
  return { state, saveCreds, dataStore, mediaStore, sessionStore }
}
