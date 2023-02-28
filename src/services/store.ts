import { AuthenticationState, makeInMemoryStore } from '@adiwajshing/baileys'

export declare type DataStore = ReturnType<typeof makeInMemoryStore>

export interface store {
  (phone: string): Promise<{
    state: AuthenticationState
    saveCreds: () => Promise<void>
    dataStore: DataStore
  }>
}
