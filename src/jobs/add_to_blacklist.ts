import { addToBlacklistInMemory } from '../services/blacklist'
import { setBlacklist } from '../services/redis'

export const addToBlacklist = async (_phone: string, data: object) => {
  const { from, webhookId, to, ttl } = data as any
  await setBlacklist(from, webhookId, to, ttl)
  await addToBlacklistInMemory(from, webhookId, to, ttl)
}
