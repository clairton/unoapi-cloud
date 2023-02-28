import { useMultiFileAuthState, makeInMemoryStore } from '@adiwajshing/baileys'
import { store } from './store'

export const multiFileStore: store = async (phone) => {
  const { state, saveCreds } = await useMultiFileAuthState(`./data/sessions/${phone}`)

  const dataStore = makeInMemoryStore({})
  const dataFile = `./data/sessions/${phone}/store.json`
  dataStore.readFromFile(dataFile)
  setInterval(() => dataStore.writeToFile(dataFile), 10_000)

  return { state, saveCreds, dataStore }
}
