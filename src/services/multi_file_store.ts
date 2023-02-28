import { useMultiFileAuthState } from '@adiwajshing/baileys'
import { store } from './store'

export const multiFileStore: store = async (phone) => useMultiFileAuthState(`./data/sessions/${phone}`)
