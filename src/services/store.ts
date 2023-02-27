import { AuthenticationState } from '@adiwajshing/baileys'

export interface store {
  (): Promise<{
    state: AuthenticationState
    saveCreds: () => Promise<void>
  }>
}
