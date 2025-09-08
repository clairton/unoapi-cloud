import { UNOAPI_AUTH_TOKEN } from '../defaults'
import { SessionStore } from './session_store'
import { Dirent, existsSync, readdirSync } from 'fs'

export const SESSION_DIR = './data/sessions'

export class SessionStoreFile extends SessionStore {
  private sessionDir: string

  constructor(sessionDir: string = SESSION_DIR) {
    super()
    this.sessionDir = sessionDir
  }

  async getTokens(_phone: string): Promise<string[]> {
    return [UNOAPI_AUTH_TOKEN!]
  }

  async getPhones(): Promise<string[]> {
    if (existsSync(this.sessionDir)) {
      const dirents: Dirent[] = readdirSync(this.sessionDir, { withFileTypes: true })
      const directories = dirents.filter((dirent) => dirent.isDirectory())
      const phones = directories.map((d) => d.name)
      return phones
    } else {
      return []
    }
  }
}
