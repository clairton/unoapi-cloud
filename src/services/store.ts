import { AuthenticationState } from '@adiwajshing/baileys'

export declare const Store: () => Promise<{
  state: AuthenticationState
  saveCreds: () => Promise<void>
}>
