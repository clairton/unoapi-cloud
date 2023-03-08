import { useMultiFileAuthState } from '@adiwajshing/baileys'
import { store } from './store'
import { DataStore } from './data_store'
import { getFileDataStore } from './get_file_data_store'
import { MEDIA_DIR } from './file_data_store'

export const SESSION_DIR = './data/sessions'

export const fileStore: store = async (phone) => {
  const sessionDir = `${SESSION_DIR}/${phone}`
  const mediaDir = `${MEDIA_DIR}/${phone}`
  console.debug(`Store session in directory: ${sessionDir}`)
  console.debug(`Store medias in directory: ${mediaDir}`)
  const { state, saveCreds } = await useMultiFileAuthState(sessionDir)
  const data: DataStore = getFileDataStore(phone, {})
  const dataFile = `./data/stores/${phone}.json`
  console.debug(`Store data in file: ${dataFile}`)
  data.readFromFile(dataFile)
  setInterval(() => {
    data.writeToFile(dataFile), 10_0000
  })

  return { state, saveCreds, dataStore: data }
}
