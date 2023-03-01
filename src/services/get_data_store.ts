import { DataStore } from './data_store'

export interface getDataStore {
  (phone: string, config: unknown): DataStore
}
