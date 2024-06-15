import { addToBlacklistInMemory } from '../services/blacklist'
import logger from '../services/logger'
import { setBlacklist } from '../services/redis'

export const addToBlacklist = async (_phone: string, data: object) => {
  const { from, webhookId, to, ttl } = data as any
  logger.debug('Add blacklist  from: %s, webhook: %s, to: %s, ttl: %s', from, webhookId, to, ttl)
  await setBlacklist(from, webhookId, to, ttl)
  await addToBlacklistInMemory(from, webhookId, to, ttl)
}
