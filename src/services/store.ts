import { AuthenticationState } from '@adiwajshing/baileys'
import { DataStore } from './data_store'

export interface getStore {
  (phone: string): Promise<Store>
}

export type Store = {
  dataStore: DataStore
  state: AuthenticationState
  saveCreds: () => Promise<void>
}

export interface store {
  (phone: string): Promise<Store>
}
