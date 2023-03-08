import { storeFile } from './store_file'
import { getStore } from './get_store'
import { Store } from './store'

const stores: Map<string, Store> = new Map()

export const getStoreFile: getStore = async (phone: string): Promise<Store> => {
  if (!stores.has(phone)) {
    console.debug('Creating file store %s', phone)
    const fstore: Store = await storeFile(phone)
    stores.set(phone, fstore)
  } else {
    console.debug('Retrieving file store %s', phone)
  }
  return stores.get(phone) as Store
}
