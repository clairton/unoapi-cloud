import { fileDataStore } from './file_data_store'
import { DataStore } from './data_store'
import { getDataStore } from './get_data_store'

const stores: Map<string, DataStore> = new Map()

export const getFileDataStore: getDataStore = (phone: string, config: object): DataStore => {
  if (!stores.has(phone)) {
    console.debug('Creating file data store %s', phone)
    const store = fileDataStore(phone, config)
    stores.set(phone, store)
  } else {
    console.debug('Retrieving file data store %s', phone)
  }
  return stores.get(phone) as DataStore
}
