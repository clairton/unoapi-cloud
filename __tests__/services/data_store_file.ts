import { DataStore } from '../../src/services/data_store'
import { getDataStoreFile } from '../../src/services/data_store_file'
import { defaultConfig } from '../../src/services/config'

describe('service data store file', () => {
  const phone = `${new Date().getMilliseconds()}`
  test('return a new instance', async () => {
    const dataStore: DataStore = await getDataStoreFile(phone, defaultConfig)
    expect(dataStore).toBe(dataStore)
  })
})
