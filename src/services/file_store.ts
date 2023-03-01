import { useMultiFileAuthState } from '@adiwajshing/baileys'
import { store } from './store'
import { DataStore, dataStore } from './data_store'

export const fileStore: store = async (phone) => {
  const { state, saveCreds } = await useMultiFileAuthState(`./data/sessions/${phone}`)

  const data: DataStore = dataStore({})
  const dataFile = `./data/sessions/${phone}/store.json`
  data.readFromFile(dataFile)
  setInterval(() => data.writeToFile(dataFile), 10_000)

  return { state, saveCreds, dataStore: data }
}
