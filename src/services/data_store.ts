import { makeInMemoryStore, WAMessage, WAMessageKey, WASocket } from '@adiwajshing/baileys'

export const dataStores: Map<string, DataStore> = new Map()

export interface getDataStore {
  (phone: string, config: object): DataStore
}

export type DataStore = ReturnType<typeof makeInMemoryStore> & {
  loadKey: (id: string) => WAMessageKey | undefined
  setKey: (id: string, key: WAMessageKey) => void
  setUnoId: (id: string, unoId: string) => void
  loadUnoId: (id: string) => string | undefined
  getJid: (phone: string, sock: Partial<WASocket>) => Promise<string>
  setMessage: (id: string, message: WAMessage) => void
  saveMedia: (waMessage: WAMessage) => Promise<void>
  cleanSession: () => Promise<void>
}
