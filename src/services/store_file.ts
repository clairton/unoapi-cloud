import { useMultiFileAuthState, AuthenticationState } from '@adiwajshing/baileys'
import { store, Store } from './store'
import { DataStore } from './data_store'
import { getDataStoreFile } from './data_store_file'
import { MEDIA_DIR } from './data_store_file'
import { existsSync, readFileSync, rmSync, mkdirSync } from 'fs'
import { SESSION_DIR } from './session_store_file'
import { getStore, stores } from './store'

const STORE_DIR = `./data/stores`

export const getStoreFile: getStore = async (phone: string): Promise<Store> => {
  if (!stores.has(phone)) {
    console.debug('Creating file store %s', phone)
    const fstore: Store = await storeFile(phone)
    stores.set(phone, fstore)
  } else {
    console.debug('Retrieving file store %s', phone)
  }
  return stores.get(phone) as Store
}

const storeFile: store = async (phone: string): Promise<Store> => {
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
  const { state, saveCreds }: { state: AuthenticationState; saveCreds: () => Promise<void> } = await useMultiFileAuthState(sessionDir)
  const dataStore: DataStore = getDataStoreFile(phone, {}) as DataStore
  const dataFile = `${STORE_DIR}/${phone}.json`
  console.info(`Store data in file: ${dataFile}`)
  if (existsSync(dataFile)) {
    console.debug(`Store data in file already exist: ${dataFile}`)
    const content = readFileSync(dataFile)
    if (content.toString()) {
      try {
        JSON.parse(content.toString())
      } catch (e) {
        console.warn(`Store data in file content is corrupted and was removed: ${dataFile}`)
        rmSync(dataFile)
      }
    } else {
      console.debug(`Store data in file content is empty and was removed: ${dataFile}`)
      rmSync(dataFile)
    }
  }
  dataStore.readFromFile(dataFile)
  setInterval(() => {
    dataStore.writeToFile(dataFile), 10_0000
  })
  return { state, saveCreds, dataStore }
}
