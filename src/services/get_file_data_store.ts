import { fileDataStore } from './file_data_store'
import { DataStore } from './data_store'
import { getDataStore } from './get_data_store'

const stores: Map<string, DataStore> = new Map()

export const getFileDataStore: getDataStore = (phone: string, config: object): DataStore => {
  if (!stores.has(phone)) {
    const store = fileDataStore(phone, config)
    stores.set(phone, store)
  }
  return stores.get(phone) as DataStore
}
