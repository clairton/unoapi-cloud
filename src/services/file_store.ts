import { useMultiFileAuthState } from '@adiwajshing/baileys'
import { store } from './store'
import { DataStore } from './data_store'
import { getFileDataStore } from './get_file_data_store'

export const fileStore: store = async (phone) => {
  const { state, saveCreds } = await useMultiFileAuthState(`./data/sessions/${phone}`)
  const data: DataStore = getFileDataStore(phone, {})
  const dataFile = `./data/sessions/${phone}/store.json`
  data.readFromFile(dataFile)
  setInterval(() => data.writeToFile(dataFile), 10_000)

  return { state, saveCreds, dataStore: data }
}
