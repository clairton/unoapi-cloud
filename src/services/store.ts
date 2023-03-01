import { AuthenticationState } from '@adiwajshing/baileys'
import { DataStore } from './data_store'

export interface store {
  (phone: string): Promise<{
    state: AuthenticationState
    saveCreds: () => Promise<void>
    dataStore: DataStore
  }>
}
