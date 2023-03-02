export interface SessionStore {
  getPhones(): Promise<string[]>
}
