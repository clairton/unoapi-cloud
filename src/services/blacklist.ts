import NodeCache from 'node-cache'
import { amqpEnqueue } from '../amqp'
import { UNOAPI_JOB_BLACKLIST_ADD } from '../defaults'
import { blacklist, redisTtl, redisKeys } from './redis'
import logger from './logger'

const DATA = new NodeCache()
let searchData = true

export interface addToBlacklist {
  (from: string, webhookId: string, to: string, ttl: number): Promise<Boolean>
}

export interface isInBlacklist {
  (from: string, webhookId: string, payload: object): Promise<String>
}

export const extractDestinyPhone = (payload: object) => {
  const data = payload as any
  const number = (data?.to || (
    data.entry
    && data.entry[0]
    && data.entry[0].changes
    && data.entry[0].changes[0]
    && data.entry[0].changes[0].value
    && data.entry[0].changes[0].value.contacts
    && data.entry[0].changes[0].value.contacts[0]
    && data.entry[0].changes[0].value.contacts[0].wa_id)?.replace('+', '')
  )
  if (!number) {
    throw Error(`error on get phone number from ${JSON.stringify(payload)}`)
  }
  return number
}

export const blacklistInMemory = (from: string, webhookId: string, to: string) => {
  return `${from}:${webhookId}:${to}`
}

export const isInBlacklistInMemory: isInBlacklist = async (from: string, webhookId: string, payload: object) => {
  const to = extractDestinyPhone(payload)
  const key = blacklistInMemory(from, webhookId, to)
  return DATA.get(key) || ''
}

export const addToBlacklistInMemory: addToBlacklist = async (from: string, webhookId: string, to: string, ttl: number) => {
  const key = blacklistInMemory(from, webhookId, to)
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
      const inMemorykey = blacklistInMemory(from, webhookId, to)
      return DATA.set(inMemorykey, to, ttl)
    })
    await Promise.all(promises)
  }
  return isInBlacklistInMemory(from, webhookId, payload)
}

export const addToBlacklistJob: addToBlacklist = async (from: string, webhookId: string, to: string, ttl: number) => {
  await amqpEnqueue(UNOAPI_JOB_BLACKLIST_ADD, '', { from, webhookId, to, ttl })
  return true
}

