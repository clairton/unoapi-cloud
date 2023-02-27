import { useMultiFileAuthState } from '@adiwajshing/baileys'

export const MultiFileStore = async () => useMultiFileAuthState('./data/sessions')
