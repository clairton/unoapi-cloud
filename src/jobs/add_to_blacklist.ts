import { addToBlacklistRedis } from '../services/blacklist'
import logger from '../services/logger'

export const addToBlacklist = async (_phone: string, data: object) => {
  const { from, webhookId, to, ttl } = data as any
  logger.debug('Add blacklist from: %s, webhook: %s, to: %s, ttl: %s', from, webhookId, to, ttl)
  await addToBlacklistRedis(from, webhookId, to, ttl)
}
export default addToBlacklist
