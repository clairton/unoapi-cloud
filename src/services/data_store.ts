import { makeInMemoryStore, WAMessage, WAMessageKey, WASocket } from '@adiwajshing/baileys'

export const dataStores: Map<string, DataStore> = new Map()

export interface getDataStore {
  (phone: string, config: object): DataStore
}

export type DataStore = ReturnType<typeof makeInMemoryStore> & {
  loadKey: (id: string) => Promise<WAMessageKey | undefined>
  setKey: (id: string, key: WAMessageKey) => Promise<void>
  setUnoId: (id: string, unoId: string) => Promise<void>
  loadUnoId: (id: string) => Promise<string | undefined>
  getJid: (phone: string, sock: Partial<WASocket>) => Promise<string>
  setMessage: (id: string, message: WAMessage) => Promise<void>
  saveMedia: (waMessage: WAMessage) => Promise<void>
  removeMedia: (fileName: string) => Promise<void>
  cleanSession: () => Promise<void>
}
