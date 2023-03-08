import { useMultiFileAuthState } from '@adiwajshing/baileys'
import { store } from './store'
import { DataStore } from './data_store'
import { getFileDataStore } from './get_file_data_store'
import { MEDIA_DIR } from './file_data_store'
import { existsSync, readFileSync, rmSync } from 'fs'

export const SESSION_DIR = './data/sessions'

export const fileStore: store = async (phone) => {
  const sessionDir = `${SESSION_DIR}/${phone}`
  const mediaDir = `${MEDIA_DIR}/${phone}`
  console.info(`Store session in directory: ${sessionDir}`)
  console.info(`Store medias in directory: ${mediaDir}`)
  const { state, saveCreds } = await useMultiFileAuthState(sessionDir)
  const dataStore: DataStore = getFileDataStore(phone, {})
  const dataFile = `./data/stores/${phone}.json`
  console.info(`Store data in file: ${dataFile}`)
  if (existsSync(dataFile)) {
    console.debug(`Store data in file already exist: ${dataFile}`)
    const content = readFileSync(dataFile)
    if (!content.toString()) {
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
