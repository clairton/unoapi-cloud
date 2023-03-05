import { DataStore } from '../../src/services/data_store'
import { getFileDataStore } from '../../src/services/get_file_data_store'

describe('service get file data store', () => {
  const phone = `${new Date().getMilliseconds()}`
  test('return a new instance', async () => {
    const dataStore: DataStore = getFileDataStore(phone, {})
    expect(dataStore).toBe(dataStore)
  })
})
