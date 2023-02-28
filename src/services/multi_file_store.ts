import { useMultiFileAuthState, makeInMemoryStore } from '@adiwajshing/baileys'
import { store } from './store'

export const multiFileStore: store = async (phone) => {
  const { state, saveCreds } = await useMultiFileAuthState(`./data/sessions/${phone}`)
  return { state, saveCreds, store: makeInMemoryStore({}) }
}
