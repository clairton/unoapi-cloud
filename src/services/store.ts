import { AuthenticationState } from '@whiskeysockets/baileys'
import { DataStore } from './data_store'
import { MediaStore } from './media_store'
import { Config } from './config'

export const stores: Map<string, Store> = new Map()

export interface getStore {
  (phone: string, config: Config): Promise<Store>
}

export type Store = {
  dataStore: DataStore
  state: AuthenticationState
  saveCreds: () => Promise<void>
  mediaStore: MediaStore
}

export interface store {
  (phone: string, config: Config): Promise<Store>
}
