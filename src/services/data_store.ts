import { GroupMetadata, makeInMemoryStore, WAMessage, WAMessageKey, WASocket } from 'baileys'
import { Config } from './config'

export const dataStores: Map<string, DataStore> = new Map()

export interface getDataStore {
  (phone: string, config: Config): Promise<DataStore>
}

export type MessageStatus = 'scheduled'
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
      | 'deleted'

export type DataStore = ReturnType<typeof makeInMemoryStore> & {
  type: string
  loadKey: (id: string) => Promise<WAMessageKey | undefined>
  setKey: (id: string, key: WAMessageKey) => Promise<void>
  setUnoId: (id: string, unoId: string) => Promise<void>
  setMediaPayload: (id: string, payload: any) => Promise<void>
  loadMediaPayload: (id: string) => Promise<any>
  setImageUrl: (jid: string, url: string) => Promise<void>
  getImageUrl: (jid: string) => Promise<string | undefined>
  loadImageUrl: (jid: string, sock: Partial<WASocket>) => Promise<string | undefined>
  setGroupMetada: (jid: string, data: GroupMetadata) => Promise<void>
  getGroupMetada: (jid: string) => Promise<GroupMetadata | undefined>
  loadGroupMetada: (jid: string, sock: Partial<WASocket>) => Promise<GroupMetadata | undefined>
  loadUnoId: (id: string) => Promise<string | undefined>
  setStatus: (id: string, status: MessageStatus) => Promise<void>
  loadStatus: (id: string) => Promise<string | undefined>
  getJid: (phone: string) => Promise<string | undefined>
  loadJid: (phone: string, sock: WASocket) => Promise<string | undefined>
  setJid: (phone: string, jid: string) => Promise<void>
  setMessage: (jid: string, message: WAMessage) => Promise<void>
  cleanSession: () => Promise<void>
  loadTemplates(): Promise<object[]>
  setTemplates(templates: string): Promise<void>
}
