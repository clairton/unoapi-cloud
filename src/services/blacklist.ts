import NodeCache from 'node-cache'
import { amqpPublish } from '../amqp'
import { UNOAPI_JOB_BLACKLIST_ADD } from '../defaults'
import { blacklist, redisTtl, redisKeys, setBlacklist } from './redis'
import logger from './logger'
import { extractDestinyPhone } from './transformer'

const DATA = new NodeCache()
let searchData = true

export interface addToBlacklist {
  (from: string, webhookId: string, to: string, ttl: number): Promise<Boolean>
}

export interface isInBlacklist {
  (from: string, webhookId: string, payload: object): Promise<String>
}

export const blacklistInMemory = (from: string, webhookId: string, to: string) => {
  return `${from}:${webhookId}:${to}`
}

export const isInBlacklistInMemory: isInBlacklist = async (from: string, webhookId: string, payload: object) => {
  const to = extractDestinyPhone(payload)
  const key = blacklistInMemory(from, webhookId, to)
  const cache: string | undefined = DATA.get(key)
  logger.debug('Retrieve destiny phone %s and verify key %s is %s in cache', to, key, cache ? 'present' : 'not present')
  return cache || ''
}

export const addToBlacklistInMemory: addToBlacklist = async (from: string, webhookId: string, to: string, ttl: number) => {
  const key = blacklistInMemory(from, webhookId, to)
  logger.debug('Add %s to blacklist with ttl %s', key, ttl)
  if (ttl > 0) {
    return DATA.set(key, to, ttl)
  } else if (ttl == 0) {
    DATA.del(key)
    return true
  } else {
    return DATA.set(key, to)
  }
}

export const cleanBlackList = async () => {
  DATA.flushAll()
  searchData = true
}

export const isInBlacklistInRedis: isInBlacklist = async (from: string, webhookId: string, payload: object) => {
  if (DATA.getStats().keys <= 0 && searchData) {
    searchData = false
    const pattern = `${blacklist('', '', '').replaceAll('::', '')}*`
    const keys = await redisKeys(pattern)
    logger.info(`Load ${keys.length} items in blacklist`)
    const promises = keys.map(async key => {
      const ttl = await redisTtl(key)
      const [ _k, from, webhookId, to ] = key.split(':')
      return addToBlacklistInMemory(from, webhookId, to, ttl)
    })
    await Promise.all(promises)
  }
  return isInBlacklistInMemory(from, webhookId, payload)
}

export const addToBlacklistRedis: addToBlacklist = async (from: string, webhookId: string, to: string, ttl: number) => {
  await setBlacklist(from, webhookId, to, ttl)
  await addToBlacklistInMemory(from, webhookId, to, ttl)
  return true
}

export const addToBlacklistJob: addToBlacklist = async (from: string, webhookId: string, to: string, ttl: number) => {
  await amqpPublish(UNOAPI_JOB_BLACKLIST_ADD, from, { from, webhookId, to, ttl })
  return true
}