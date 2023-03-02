import { useMultiFileAuthState } from '@adiwajshing/baileys'
import { store } from './store'
import { DataStore } from './data_store'
import { getFileDataStore } from './get_file_data_store'

export const SESSION_DIR = './data/sessions'

export const fileStore: store = async (phone) => {
  const sessionDir = `${SESSION_DIR}/${phone}`
  console.debug(`Store session in directory: ${sessionDir}`)
  const { state, saveCreds } = await useMultiFileAuthState(sessionDir)
  const data: DataStore = getFileDataStore(phone, {})
  const dataFile = `./data/sessions/${phone}/store.json`
  console.debug(`Store data in file: ${dataFile}`)
  data.readFromFile(dataFile)
  setInterval(() => {
    data.writeToFile(dataFile), 10_0000
  })

  return { state, saveCreds, dataStore: data }
}
