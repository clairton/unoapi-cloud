import { GroupMetadata, makeInMemoryStore, WAMessage, WAMessageKey, WASocket } from '@whiskeysockets/baileys'
import { Config } from './config'

export const dataStores: Map<string, DataStore> = new Map()

export interface getDataStore {
  (phone: string, config: Config): Promise<DataStore>
}

export type DataStore = ReturnType<typeof makeInMemoryStore> & {
  loadKey: (id: string) => Promise<WAMessageKey | undefined>
  setKey: (id: string, key: WAMessageKey) => Promise<void>
  setUnoId: (id: string, unoId: string) => Promise<void>
  setImageUrl: (jid: string, url: string) => Promise<void>
  getImageUrl: (jid: string) => Promise<string | undefined>
  loadImageUrl: (jid: string, sock: Partial<WASocket>) => Promise<string | undefined>
  setGroupMetada: (jid: string, data: GroupMetadata) => Promise<void>
  getGroupMetada: (jid: string) => Promise<GroupMetadata | undefined>
  loadGroupMetada: (jid: string, sock: Partial<WASocket>) => Promise<GroupMetadata | undefined>
  loadUnoId: (id: string) => Promise<string | undefined>
  setStatus: (
    id: string,
    status:
      | 'scheduled'
      | 'pending'
      | 'without-whatsapp'
      | 'invalid-phone-number'
      | 'error'
      | 'failed'
      | 'sent'
      | 'delivered'
      | 'read'
      | 'played'
      | 'accepted'
      | 'deleted',
  ) => Promise<void>
  loadStatus: (id: string) => Promise<string | undefined>
  getJid: (phone: string, sock: WASocket) => Promise<string | undefined>
  loadJid: (phone: string) => Promise<string | undefined>
  setJid: (phone: string, jid: string) => Promise<void>
  setMessage: (jid: string, message: WAMessage) => Promise<void>
  cleanSession: () => Promise<void>
  loadTemplates(): Promise<object[]>
  setTemplates(templates: string): Promise<void>
}
