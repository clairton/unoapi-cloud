import { BufferJSON, initAuthCreds, proto, AuthenticationState } from '@adiwajshing/baileys'
import { rmSync, writeFileSync, readFileSync, existsSync, mkdirSync } from 'fs'

export const useFileAuthState = async (phone: string) => {
  const getKey = (key: string) => `${phone}${key ? key : '/main.json'}`.replace('/.', '')

  if (!existsSync(phone)) {
    mkdirSync(phone, { recursive: true })
  }

  const fileGet = (key) => {
    if (existsSync(key)) {
      return readFileSync(key)
    }
    return ''
  }

  const fileSet = (key, value) => {
    if (existsSync(key)) {
      fileDel(key)
    }
    writeFileSync(key, value)
  }

  const fileDel = (key) => {
    rmSync(key)
  }

  const setAuth = (key, value, stringify) => {
    const authValue = stringify(value)
    return fileSet(key, authValue)
  }
  const getAuth = async (key, parse) => {
    const authString = await fileGet(key)
    if (authString) {
      const authJson = parse(authString)
      return authJson
    }
  }
  const delAuth = async (key) => {
    if (existsSync(key)) {
      return fileDel(key)
    }
  }

  const writeData = (key: string, data: object) => {
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

  const creds = (await readData('')) || initAuthCreds()

  const keys = {
    get: async (type: string, ids: string[]) => {
      const data = {}
      await Promise.all(
        ids.map(async (id) => {
          let value = await readData(`/${type}-${id}.json`)
          if (type === 'app-state-sync-key' && value) {
            value = proto.Message.AppStateSyncKeyData.fromObject(value)
          }
          Reflect.set(data, id, value)
        }),
      )

      return data
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    set: async (data: any) => {
      const tasks = []
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
    await writeData('/main.json', creds)
  }

  return {
    state,
    saveCreds,
  }
}
