import fs from 'fs'
import { SessionStoreFile } from '../../src/services/session_store_file'
import { MAX_CONNECT_RETRY } from '../../src/defaults'

describe('service session store file', () => {
  test('return a phones', async () => {
    const name = `${new Date().getTime()}`
    const d = new fs.Dirent()
    d.name = name
    d.isDirectory = () => true
    fs.existsSync = jest.fn().mockReturnValue(true)
    fs.readdirSync = jest.fn().mockReturnValue([d])
    const store = new SessionStoreFile()
    const phones = await store.getPhones()
    expect(phones[0]).toBe(name)
  })

  test('return empty', async () => {
    fs.existsSync = jest.fn().mockReturnValue(true)
    fs.readdirSync = jest.fn().mockReturnValue([])
    const store = new SessionStoreFile()
    const phones = await store.getPhones()
    expect(phones.length).toBe(0)
  })

  test('return empty when nos exist dir', async () => {
    fs.existsSync = jest.fn().mockReturnValue(false)
    const store = new SessionStoreFile()
    const phones = await store.getPhones()
    expect(phones.length).toBe(0)
  })
  test('return a standby on count and verify', async () => {
    const session = `${new Date().getTime()}`
    const store = new SessionStoreFile()
    const getConnectCount = store.getConnectCount
    store.getConnectCount = async (phone: string) => {
      if (session == phone) {
        return MAX_CONNECT_RETRY + 1
      }
      return getConnectCount(session)
    }
    expect(await store.verifyStatusStandBy(session)).toBe(true)
  })
  test('return a no standby on count and verify', async () => {
    const session = `${new Date().getTime()}`
    const store = new SessionStoreFile()
    const getConnectCount = store.getConnectCount
    store.getConnectCount = async (phone: string) => {
      if (session == phone) {
        return MAX_CONNECT_RETRY - 2
      }
      return getConnectCount(session)
    }
    expect(!!(await store.verifyStatusStandBy(session))).toBe(false)
  })
})
