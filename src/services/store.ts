import { AuthenticationState } from '@adiwajshing/baileys'

export interface store {
  (phone: string): Promise<{
    state: AuthenticationState
    saveCreds: () => Promise<void>
  }>
}
