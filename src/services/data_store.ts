import { makeInMemoryStore, proto } from '@adiwajshing/baileys'

export type DataStore = ReturnType<typeof makeInMemoryStore> & {
  loadKey: (id: string) => proto.IMessageKey | undefined
}
