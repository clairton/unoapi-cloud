import { AuthenticationState } from '@whiskeysockets/baileys'
import { store, Store } from './store'
import { DataStore } from './data_store'
import { getDataStoreFile } from './data_store_file'
import { useFileAuthState } from './use_file_auth_state'
import { MEDIA_DIR } from './data_store_file'
import { existsSync, readFileSync, rmSync, mkdirSync, renameSync } from 'fs'
import { SESSION_DIR } from './session_store_file'
import { getStore, stores } from './store'
import { MediaStore } from './media_store'
import { getMediaStoreFile } from './media_store_file'
import { Config } from './config'

const STORE_DIR = `./data/stores`

export const getStoreFile: getStore = async (phone: string, config: Config): Promise<Store> => {
  if (!stores.has(phone)) {
    console.debug('Creating file store %s', phone)
    const fstore: Store = await storeFile(phone, config)
    stores.set(phone, fstore)
  } else {
    console.debug('Retrieving file store %s', phone)
  }
  return stores.get(phone) as Store
}

const storeFile: store = async (phone: string, config: Config): Promise<Store> => {
  const dirs = [SESSION_DIR, MEDIA_DIR, STORE_DIR]
  dirs.forEach((dir) => {
    if (!existsSync(dir)) {
      console.debug(`Creating dir: ${dir}`)
      mkdirSync(dir, { recursive: true })
    } else {
      console.debug(`Using dir: ${dir}`)
    }
  })
  const sessionDir = `${SESSION_DIR}/${phone}`
  const mediaDir = `${MEDIA_DIR}/${phone}`
  console.info(`Store session in directory: ${sessionDir}`)
  console.info(`Store medias in directory: ${mediaDir}`)
  const { state, saveCreds }: { state: AuthenticationState; saveCreds: () => Promise<void> } = await useFileAuthState(sessionDir)
  const dataStore: DataStore = getDataStoreFile(phone, config) as DataStore
  const mediaStore: MediaStore = getMediaStoreFile(phone, config, getDataStoreFile) as MediaStore
  const dataFile = `${STORE_DIR}/${phone}.json`
  console.info(`Store data in file: ${dataFile}`)
  if (existsSync(dataFile)) {
    console.debug(`Store data in file already exist: ${dataFile}`)
    const content = readFileSync(dataFile)
    if (content.toString()) {
      try {
        JSON.parse(content.toString())
      } catch (e) {
        const dest = `${dataFile}.old${new Date().getTime()}`
        console.warn(`Store data in file: ${dataFile}, content is corrupted and was moved to ${dest}`)
        renameSync(dataFile, dest)
      }
    } else {
      console.debug(`Store data in file content is empty and was removed: ${dataFile}`)
      rmSync(dataFile)
    }
  }
  try {
    dataStore.readFromFile(dataFile)
  } catch (error) {
    console.debug(`Try read ${dataFile} again....`)
    try {
      dataStore.readFromFile(dataFile)
    } catch (error) {
      console.error(`Error on read data store`, error)
    }
  }
  setInterval(() => {
    dataStore.writeToFile(dataFile), 10_0000
  })
  return { state, saveCreds, dataStore, mediaStore }
}
