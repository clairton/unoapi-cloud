import { SessionStore } from './session_store'
import { readdir } from 'fs/promises'
import { Dirent, existsSync } from 'fs'

export const SESSION_DIR = './data/sessions'

export class SessionStoreFile implements SessionStore {
  private sessionDir: string

  constructor(sessionDir: string = SESSION_DIR) {
    this.sessionDir = sessionDir
  }

  async getPhones(): Promise<string[]> {
    if (existsSync(this.sessionDir)) {
      const dirents: Dirent[] = await readdir(this.sessionDir, { withFileTypes: true })
      const directories = dirents.filter((dirent) => dirent.isDirectory())
      const phones = directories.map((d) => d.name)
      return phones
    } else {
      return []
    }
  }
}
