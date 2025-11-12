import { initAuthCreds, proto, AuthenticationState, AuthenticationCreds, makeCacheableSignalKeyStore } from 'baileys'
import { session } from './session'
import logger from './logger'

export const authState = async (session: session, phone: string) => {
  const { readData, writeData, removeData, getKey } = await session(phone)

  const creds: AuthenticationCreds = ((await readData('')) || initAuthCreds()) as AuthenticationCreds

  const keys = {
    get: async (type: string, ids: string[]) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const data: any = {}
      await Promise.all(
        ids.map(async (id) => {
          const key = getKey(type, id)
          const value = await readData(key)
          if (type === 'app-state-sync-key' && value) {
            data[id] = proto.Message.AppStateSyncKeyData.create(value)
          } else {
            data[id] = value
          }
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
          const key = getKey(category, id)
          tasks.push(value ? writeData(key, value) : removeData(key))
        }
      }
      await Promise.all(tasks)
    },
  }

  const state: AuthenticationState = {
    creds,
    keys: makeCacheableSignalKeyStore(keys, logger),
  }

  const saveCreds: () => Promise<void> = async () => {
    logger.debug('save creds %s', phone)
    return await writeData('', creds)
  }

  return {
    state,
    saveCreds,
  }
}
