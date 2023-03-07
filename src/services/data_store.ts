import { makeInMemoryStore, WAMessage, WAMessageKey } from '@adiwajshing/baileys'

export type DataStore = ReturnType<typeof makeInMemoryStore> & {
  loadKey: (id: string) => WAMessageKey | undefined
  setKey: (id: string, key: WAMessageKey) => void
  setMessage: (id: string, message: WAMessage) => void
  saveMedia: (waMessage: WAMessage) => Promise<void>
}
