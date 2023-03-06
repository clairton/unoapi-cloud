import { makeInMemoryStore, WAMessage, WAMessageKey } from '@adiwajshing/baileys'

export type DataStore = ReturnType<typeof makeInMemoryStore> & {
  loadKey: (id: string) => WAMessageKey | undefined
  saveMedia: (waMessage: WAMessage) => Promise<void>
}
