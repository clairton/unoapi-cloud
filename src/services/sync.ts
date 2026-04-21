export interface Sync {
  process(phone: string, jids: string[], force: boolean): Promise<boolean>
}
