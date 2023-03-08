import { dataStoreFile } from './data_store_file'
import { DataStore } from './data_store'
import { getDataStore } from './get_data_store'

const stores: Map<string, DataStore> = new Map()

export const getDataStoreFile: getDataStore = (phone: string, config: object): DataStore => {
  if (!stores.has(phone)) {
    console.debug('Creating file data store %s', phone)
    const store = dataStoreFile(phone, config)
    stores.set(phone, store)
  } else {
    console.debug('Retrieving file data store %s', phone)
  }
  return stores.get(phone) as DataStore
}
