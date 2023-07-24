import { AuthenticationState } from '@whiskeysockets/baileys'
import { store, Store } from './store'
import { DataStore } from './data_store'
import { getDataStoreFile } from './data_store_file'
import { authState } from './auth_state'
import { sessionFile } from './session_file'
import { MEDIA_DIR } from './data_store_file'
import { existsSync, readFileSync, rmSync, mkdirSync, renameSync } from 'fs'
import { SESSION_DIR } from './session_store_file'
import { getStore, stores } from './store'
import { MediaStore } from './media_store'
import { getMediaStoreFile } from './media_store_file'
import { Config } from './config'
import logger from './logger'

const STORE_DIR = `./data/stores`

export const getStoreFile: getStore = async (phone: string, config: Config): Promise<Store> => {
  if (!stores.has(phone)) {
    logger.debug('Creating file store %s', phone)
    const fstore: Store = await storeFile(phone, config)
    stores.set(phone, fstore)
  } else {
    logger.debug('Retrieving file store %s', phone)
  }
  return stores.get(phone) as Store
}

const storeFile: store = async (phone: string, config: Config): Promise<Store> => {
  const dirs = [SESSION_DIR, MEDIA_DIR, STORE_DIR]
  dirs.forEach((dir) => {
    if (!existsSync(dir)) {
      logger.info(`Creating dir: ${dir}`)
      mkdirSync(dir, { recursive: true })
    } else {
      logger.info(`Using dir: ${dir}`)
    }
  })
  const sessionDir = `${SESSION_DIR}/${phone}`
  const mediaDir = `${MEDIA_DIR}/${phone}`
  logger.info(`Store session in directory: ${sessionDir}`)
  logger.info(`Store medias in directory: ${mediaDir}`)
  const { state, saveCreds }: { state: AuthenticationState; saveCreds: () => Promise<void> } = await authState(sessionFile, sessionDir)
  const dataStore: DataStore = getDataStoreFile(phone, config) as DataStore
  const mediaStore: MediaStore = getMediaStoreFile(phone, config, getDataStoreFile) as MediaStore
  if (!config.ignoreDataStore) {
    const dataFile = `${STORE_DIR}/${phone}.json`
    logger.info(`Store data in file: ${dataFile}`)
    if (existsSync(dataFile)) {
      logger.debug(`Store data in file already exist: ${dataFile}`)
      const content = readFileSync(dataFile)
      if (content.toString()) {
        try {
          JSON.parse(content.toString())
        } catch (e) {
          const dest = `${dataFile}.old${new Date().getTime()}`
          logger.warn(`Store data in file: ${dataFile}, content is corrupted and was moved to ${dest}`)
          renameSync(dataFile, dest)
        }
      } else {
        logger.debug(`Store data in file content is empty and was removed: ${dataFile}`)
        rmSync(dataFile)
      }
    }
    try {
      dataStore.readFromFile(dataFile)
    } catch (error) {
      logger.debug(`Try read ${dataFile} again....`)
      try {
        dataStore.readFromFile(dataFile)
      } catch (error) {
        logger.error(`Error on read data store`, error)
      }
    }
    setInterval(() => {
      dataStore.writeToFile(dataFile), 10_0000
    })
  } else {
    logger.info('Store data not save')
  }
  return { state, saveCreds, dataStore, mediaStore }
}
