import { BufferJSON } from '@whiskeysockets/baileys'
import { rmSync, writeFileSync, readFileSync, existsSync, mkdirSync } from 'fs'
import { session, writeData, readData, removeData, getKey } from './session'
import logger from './logger'

export const sessionFile: session = async (
  phone: string,
): Promise<{ writeData: writeData; readData: readData; removeData: removeData; getKey: getKey }> => {
  const getKey: getKey = (type: string, id: string) => `/${type}-${id}.json`
  const getFile = (key: string) => `${phone}${key ? key : '/creds.json'}`.replace('/.', '')

  if (!existsSync(phone)) {
    mkdirSync(phone, { recursive: true })
  }

  const fileGet = (key: string) => {
    if (existsSync(key)) {
      return readFileSync(key, { encoding: 'utf-8' })
    }
    return ''
  }

  const fileSet = (key: string, value: string) => {
    if (existsSync(key)) {
      fileDel(key)
    }
    writeFileSync(key, value, { encoding: 'utf-8' })
  }

  const fileDel = (key: string) => {
    rmSync(key)
  }

  const setAuth = (key: string, value: object, stringify: (p: object) => string) => {
    const authValue = stringify(value)
    return fileSet(key, authValue)
  }
  const getAuth = async (key: string, parse: (p: string) => object | undefined) => {
    const authString = await fileGet(key)
    if (authString) {
      const authJson = parse(authString)
      return authJson
    }
  }
  const delAuth = async (key: string) => {
    if (existsSync(key)) {
      return fileDel(key)
    }
  }

  const writeData: writeData = async (key: string, data: object) => {
    const file = getFile(key)
    logger.debug('write data', file)
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return setAuth(file, data, (value: any) => JSON.stringify(value, BufferJSON.replacer))
    } catch (error) {
      logger.error(`Error on write auth`, error)
      throw error
    }
  }

  const readData: readData = async (key: string) => {
    const file = getFile(key)
    logger.debug('read data', file)
    try {
      return getAuth(file, (value: string) => {
        try {
          return value ? JSON.parse(value, BufferJSON.reviver) : undefined
        } catch (error) {
          logger.error(`Error on parsing auth: ${value}`)
          throw error
        }
      })
    } catch (error) {
      logger.error(`Error on read auth`, error)
      throw error
    }
  }

  const removeData: removeData = async (key: string) => {
    const file = getFile(key)
    logger.debug('read data', file)
    logger.debug('remove data', file)
    try {
      await delAuth(file)
    } catch (error) {
      logger.error(`Error on remove auth`, error)
      throw error
    }
  }

  return { writeData, readData, removeData, getKey }
}
