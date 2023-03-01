import { makeInMemoryStore, BaileysEventEmitter, proto, Chat, Contact, WAMessage } from '@adiwajshing/baileys'

export type DataStore = ReturnType<typeof makeInMemoryStore> & {
  loadKey: (id: string) => proto.IMessageKey | undefined
}

export const dataStore = (config: any) => {
  const keys: Map<string, proto.IMessageKey> = new Map()

  const store = makeInMemoryStore(config)
  const { bind, toJSON, fromJSON } = store
  store.toJSON = () => {
    return {
      ...toJSON(),
      keys: keys.values(),
    }
  }
  store.fromJSON = (json) => {
    fromJSON(json)
    const jsonData = json as {
      keys: proto.IMessageKey[]
      chats: Chat[]
      contacts: { [id: string]: Contact }
      messages: { [id: string]: WAMessage[] }
    }
    if (jsonData?.keys) {
      keys.forEach((k: proto.IMessageKey) => {
        if (k && k.id) {
          keys.set(k.id, k)
        }
      })
    }
  }
  store.bind = async (ev: BaileysEventEmitter) => {
    await bind(ev)
    ev.on('messages.upsert', ({ messages: newMessages }) => {
      for (const msg of newMessages) {
        const { key } = msg
        const id: any = key.id
        keys.set(id, key)
      }
    })
    ev.on('messages.update', (update: any) => {
      const { key } = update
      const id: any = key.id
      keys.set(id, key)
    })
  }
  const dataStore = store as DataStore
  dataStore.loadKey = (id: string) => {
    return keys.get(id)
  }
  return dataStore
}
