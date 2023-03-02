import { SessionStore } from './session_store'
import { readdir } from 'fs/promises'
import { Dirent } from 'fs'

export class FileSessionStore implements SessionStore {
  private sessionDir: string

  constructor(sessionDir: string) {
    this.sessionDir = sessionDir
  }

  async getPhones(): Promise<string[]> {
    const dirents: Dirent[] = await readdir(this.sessionDir, { withFileTypes: true })
    const directories = dirents.filter((dirent) => dirent.isDirectory())
    const phones = directories.map((d) => d.name)
    return phones
  }
}
