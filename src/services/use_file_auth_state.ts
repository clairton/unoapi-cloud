import { BufferJSON, initAuthCreds, proto, AuthenticationState, AuthenticationCreds } from '@whiskeysockets/baileys'
import { rmSync, writeFileSync, readFileSync, existsSync, mkdirSync } from 'fs'

export const useFileAuthState = async (phone: string) => {
  const getKey = (key: string) => `${phone}${key ? key : '/creds.json'}`.replace('/.', '')

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
  const getAuth = async (key: string, parse: (p: string) => object) => {
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

  const writeData = async (key: string, data: object) => {
    const file = getKey(key)
    console.debug('write data', file)
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return setAuth(file, data, (value: any) => JSON.stringify(value, BufferJSON.replacer))
    } catch (error) {
      console.error(`Error on write auth`, error)
      throw error
    }
  }

  const readData = async (key: string) => {
    const file = getKey(key)
    console.debug('read data', file)
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return getAuth(file, (value: any) => {
        try {
          return value ? JSON.parse(value, BufferJSON.reviver) : null
        } catch (error) {
          console.error(`Error on parsing auth: ${value}`)
          throw error
        }
      })
    } catch (error) {
      console.error(`Error on read auth`, error)
      throw error
    }
  }

  const removeData = async (key: string) => {
    const file = getKey(key)
    console.debug('read data', file)
    console.debug('remove data', file)
    try {
      await delAuth(file)
    } catch (error) {
      console.error(`Error on remove auth`, error)
      throw error
    }
  }

  const creds: AuthenticationCreds = ((await readData('')) || initAuthCreds()) as AuthenticationCreds

  const keys = {
    get: async (type: string, ids: string[]) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const data: any = {}
      await Promise.all(
        ids.map(async (id) => {
          let value = await readData(`/${type}-${id}.json`)
          if (type === 'app-state-sync-key' && value) {
            value = proto.Message.AppStateSyncKeyData.fromObject(value)
          }
          data[id] = value
        }),
      )

      return data
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    set: async (data: any) => {
      const tasks: Promise<void>[] = []
      for (const category in data) {
        for (const id in data[category]) {
          const value = data[category][id]
          const key = `/${category}-${id}.json`
          tasks.push(value ? writeData(key, value) : removeData(key))
        }
      }
      await Promise.all(tasks)
    },
  }

  const state: AuthenticationState = {
    creds,
    keys,
  }

  const saveCreds: () => Promise<void> = async () => {
    console.debug('save creds')
    await writeData('/creds.json', creds)
  }

  return {
    state,
    saveCreds,
  }
}
