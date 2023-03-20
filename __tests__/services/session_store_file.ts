import fs from 'fs'
import { SessionStoreFile } from '../../src/services/session_store_file'

describe('service session store file return phones', () => {
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
})
