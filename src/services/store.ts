import { AuthenticationState } from '@adiwajshing/baileys'
import { DataStore } from './data_store'

export type Store = {
  dataStore: DataStore
  state: AuthenticationState
  saveCreds: () => Promise<void>
}

export interface store {
  (phone: string): Promise<Store>
}
