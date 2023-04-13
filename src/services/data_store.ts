import { makeInMemoryStore, WAMessage, WAMessageKey, WASocket } from '@adiwajshing/baileys'
import { Config } from './config'

export const dataStores: Map<string, DataStore> = new Map()

export interface getDataStore {
  (phone: string, config: Config): DataStore
}

export type DataStore = ReturnType<typeof makeInMemoryStore> & {
  loadKey: (id: string) => Promise<WAMessageKey | undefined>
  setKey: (id: string, key: WAMessageKey) => Promise<void>
  setUnoId: (id: string, unoId: string) => Promise<void>
  loadUnoId: (id: string) => Promise<string | undefined>
  getJid: (phone: string, sock: Partial<WASocket>) => Promise<string>
  setMessage: (jid: string, message: WAMessage) => Promise<void>
  cleanSession: () => Promise<void>
  loadTemplates(): Promise<object[]>
}
