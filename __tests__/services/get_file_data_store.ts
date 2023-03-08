import { DataStore } from '../../src/services/data_store'
import { getDataStoreFile } from '../../src/services/get_data_store_file'

describe('service get file data store', () => {
  const phone = `${new Date().getMilliseconds()}`
  test('return a new instance', async () => {
    const dataStore: DataStore = getDataStoreFile(phone, {})
    expect(dataStore).toBe(dataStore)
  })
})
