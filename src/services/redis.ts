import { createClient } from '@redis/client'
import { 
  REDIS_URL, 
  DATA_JID_TTL, 
  DATA_TTL, 
  SESSION_TTL,
  IGNORE_GROUP_MESSAGES,
  IGNORE_BROADCAST_STATUSES,
  IGNORE_BROADCAST_MESSAGES,
  IGNORE_HISTORY_MESSAGES,
  IGNORE_OWN_MESSAGES,
  IGNORE_YOURSELF_MESSAGES,
  SEND_CONNECTION_STATUS,
  NOTIFY_FAILED_MESSAGES,
  COMPOSING_MESSAGE,
  REJECT_CALLS,
  REJECT_CALLS_WEBHOOK, // Corrigido: Removido SESSION_WEBHOOK, se não existir em defaults.ts
  MESSAGE_CALLS_WEBHOOK,
  LOG_LEVEL,
  AUTO_CONNECT,
  AUTO_RESTART_MS,
  UNOAPI_RETRY_REQUEST_DELAY_MS, // Corrigido: Usando o nome correto
  THROW_WEBHOOK_ERROR,
  BASE_STORE,
  IGNORE_DATA_STORE,
  SEND_REACTION_AS_REPLY,
  SEND_PROFILE_PICTURE,
  UNOAPI_AUTH_TOKEN, // Corrigido: Usando o nome correto
  UNOAPI_HEADER_NAME, // Corrigido: Usando o nome correto
  WEBHOOK_URL_ABSOLUTE,
  WEBHOOK_TOKEN,
  WEBHOOK_HEADER 
} from '../defaults'
import logger from './logger'
import { GroupMetadata } from '@whiskeysockets/baileys'
import { Webhook, configs } from './config'


export const BASE_KEY = 'unoapi-'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let client: any

export const startRedis = async (redisUrl = REDIS_URL, retried = false) => {
  if (!client) {
    logger.info(`Starting redis....`)
    client = await redisConnect(redisUrl)
    client.on('error', async (error: string) => {
      logger.error(`Redis error: ${error}`)
      client = undefined
      if (!retried) {
        logger.info(`Redis retry connect`)
        try {
          await startRedis(redisUrl, true)
        } catch (error) {
          logger.error(`Redis error on retry connect: ${error}`)
        }
      }
    })
    logger.info(`Started redis!`)
  }
  return client
}

export const getRedis = async (redisUrl = REDIS_URL) => {
  return await startRedis(redisUrl)
}

export const redisConnect = async (redisUrl = REDIS_URL) => {
  logger.info(`Connecting redis at ${redisUrl}....`)
  const redisClient = await createClient({ url: redisUrl })
  await redisClient.connect()
  logger.info(`Connected redis!`)
  return redisClient
}

export const redisGet = async (key: string) => {
  logger.trace(`Getting ${key}`)
  try {
    return client.get(key)
  } catch (error) {
    if (!client) {
      await getRedis()
      return client.get(key)
    } else {
      throw error
    }
  }
}

export const redisTtl = async (key: string) => {
  logger.trace(`Ttl ${key}`)
  try {
    return client.ttl(key)
  } catch (error) {
    if (!client) {
      await getRedis()
      return client.ttl(key)
    } else {
      throw error
    }
  }
}

const redisDel = async (key: string) => {
  logger.trace(`Deleting ${key}`)
  try {
    return client.del(key)
  } catch (error) {
    if (!client) {
      await getRedis()
      return client.del(key)
    } else {
      throw error
    }
  }
}

export const redisKeys = async (pattern: string) => {
  logger.trace(`Keys ${pattern}`)
  try {
    return client.keys(pattern)
  } catch (error) {
    if (!client) {
      await getRedis()
      return client.keys(pattern)
    } else {
      throw error
    }
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const redisSet = async function (key: string, value: any) {
  logger.trace(`Setting ${key} => ${(value + '').substring(0, 10)}...`)
  try {
    return client.set(key, value)
  } catch (error) {
    if (!client) {
      await getRedis()
      return client.set(key, value)
    } else {
      throw error
    }
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const redisSetAndExpire = async function (key: string, value: any, ttl: number) {
  logger.trace(`Setting ttl: ${ttl} ${key} -> ${(value + '').substring(0, 10)}...`)
  if (ttl < 0) {
    return redisSet(key, value)
  }
  try {
    return client.set(key, value, { EX: ttl })
  } catch (error) {
    if (!client) {
      await getRedis()
      return client.set(key, value, { EX: ttl })
    } else {
      throw error
    }
  }
}

const authKey = (phone: string) => {
  return `${BASE_KEY}auth:${phone}`
}

const messageStatusKey = (phone: string, id: string) => {
  return `${BASE_KEY}message-status:${phone}:${id}`
}

const bulkMessageKeyBase = (phone: string, bulkId: string) => {
  return `${BASE_KEY}bulk-message:${phone}:${bulkId}`
}

const bulkMessageKey = (phone: string, bulkId: string, messageId: string, phoneNumber: string) => {
  return `${bulkMessageKeyBase(phone, bulkId)}:${messageId}:${phoneNumber}`
}

const messageKey = (phone: string, jid: string, id: string) => {
  return `${BASE_KEY}message:${phone}:${jid}:${id}`
}

export const configKey = (phone: string) => {
  return `${BASE_KEY}config:${phone}`
}

export const templateKey = (phone: string) => {
  return `${BASE_KEY}template:${phone}`
}

export const idKey = (phone: string, id: string) => {
  return `${BASE_KEY}key:${phone}:${id}`
}

export const unoIdKey = (phone: string, id: string) => {
  return `${BASE_KEY}id:${phone}:${id}`
}

export const jidKey = (phone: string, jid: string) => {
  return `${BASE_KEY}jid:${phone}:${jid}`
}

export const profilePictureKey = (phone: string, jid: string) => {
  return `${BASE_KEY}profile-picture:${phone}:${jid}`
}

export const groupKey = (phone: string, jid: string) => {
  return `${BASE_KEY}group:${phone}:${jid}`
}

export const blacklist = (from: string, webhookId: string, to: string) => {
  return `${BASE_KEY}blacklist:${from}:${webhookId}:${to}`
}

export const getJid = async (phone: string, jid: any) => {
  const key = jidKey(phone, jid)
  return redisGet(key)
}

export const setJid = async (phone: string, jid: string, validJid: string) => {
  const key = jidKey(phone, jid)
  await client.set(key, validJid, { EX: DATA_JID_TTL })
}

export const setBlacklist = async (from: string, webhookId: string, to: string, ttl: number) => {
  const key = blacklist(from, webhookId, to)
  if (ttl > 0) {
    return client.set(key, '1', { EX: ttl })
  } else if (ttl == 0) {
    return client.del(key)
  } else {
    return client.set(key, '1')
  }
}

export const getMessageStatus = async (phone: string, id: string) => {
  const key = messageStatusKey(phone, id)
  return redisGet(key)
}

export const setMessageStatus = async (phone: string, id: string, status: string) => {
  const key = messageStatusKey(phone, id)
  await client.set(key, status, { EX: DATA_TTL })
}

export const getTemplates = async (phone: string) => {
  const key = templateKey(phone)
  const configString = await redisGet(key)
  if (configString) {
    const config = JSON.parse(configString)
    return config
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const setTemplates = async (phone: string, value: any) => {
  const { id } = value
  if (!id) {
    throw new Error(`New template has no ID or an invalid format`);
  }
  const current = (await getTemplates(phone)) || {}
  const key = templateKey(phone)
  var config = value
  if (Object.keys(current).length !== 0) {
    if ('id' in current) {
      if (current.id !== id) {
        config = []
        config.push(current)
        config.push(value)
      }
    } else {
      config = []
      current.forEach(element => {
        if (element.id !== id) {
          config.push(element)
        }
      });
      config.push(value)
    }
  }
  await redisSetAndExpire(key, JSON.stringify(config), SESSION_TTL)
  return config
}

export const getConfig = async (phone: string) => {
  const key = configKey(phone)
  const configString = await redisGet(key)
  if (configString) {
    const config = JSON.parse(configString)
    return config
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const setConfig = async (phone: string, value: any) => {
  logger.info(`Valor recebido para setConfig: ${JSON.stringify(value, null, 2)}`)

  const currentConfig = await getConfig(phone) || {}
  const key = configKey(phone)

  // Definir todas as propriedades obrigatórias a partir de defaults.ts
  const defaultConfig = {
    ignoreGroupMessages: IGNORE_GROUP_MESSAGES,
    ignoreBroadcastStatuses: IGNORE_BROADCAST_STATUSES,
    ignoreBroadcastMessages: IGNORE_BROADCAST_MESSAGES,
    ignoreHistoryMessages: IGNORE_HISTORY_MESSAGES,
    ignoreOwnMessages: IGNORE_OWN_MESSAGES,
    ignoreYourselfMessages: IGNORE_YOURSELF_MESSAGES,
    sendConnectionStatus: SEND_CONNECTION_STATUS,
    notifyFailedMessages: NOTIFY_FAILED_MESSAGES,
    composingMessage: COMPOSING_MESSAGE,
    rejectCalls: REJECT_CALLS,
    rejectCallsWebhook: REJECT_CALLS_WEBHOOK,
    messageCallsWebhook: MESSAGE_CALLS_WEBHOOK,
    logLevel: LOG_LEVEL,
    autoConnect: AUTO_CONNECT,
    autoRestartMs: AUTO_RESTART_MS,
    retryRequestDelayMs: UNOAPI_RETRY_REQUEST_DELAY_MS,
    throwWebhookError: THROW_WEBHOOK_ERROR,
    baseStore: BASE_STORE,
    webhooks: [
      {
        sendNewMessages: null,
        id: "default",
        urlAbsolute: WEBHOOK_URL_ABSOLUTE,
        token: WEBHOOK_TOKEN,
        header: WEBHOOK_HEADER
      }
    ],
    ignoreDataStore: IGNORE_DATA_STORE,
    sendReactionAsReply: SEND_REACTION_AS_REPLY,
    sendProfilePicture: SEND_PROFILE_PICTURE,
    authToken: UNOAPI_AUTH_TOKEN,
    authHeader: UNOAPI_HEADER_NAME
  }

  // Garante que a lista de webhooks está presente tanto na configuração atual quanto na nova configuração
  const currentWebhooks: Webhook[] = currentConfig.webhooks || []
  const newWebhooks: Webhook[] = value.webhooks || []

  // Atualiza a lista de webhooks, mesclando os novos webhooks com os existentes
  const updatedWebhooks: Webhook[] = currentWebhooks.map((c) => {
    const n = newWebhooks.find((n) => n.id === c.id)
    return n ? { ...c, ...n } : c
  })

  // Adiciona novos webhooks que não estão na lista atual
  newWebhooks.forEach((n) => {
    if (!currentWebhooks.some((c) => c.id === n.id)) {
      updatedWebhooks.push(n)
    }
  })

  // Cria a configuração final, mesclando a configuração atual com a nova configuração e valores padrão
  const config = {
    ...defaultConfig,
    ...currentConfig,
    ...value,
    webhooks: updatedWebhooks.length > 0 ? updatedWebhooks : currentWebhooks
  }

  logger.info(`Configuração final para setConfig: ${JSON.stringify(config, null, 2)}`)

  // Armazena a configuração no Redis com o tempo de expiração definido
  await redisSetAndExpire(key, JSON.stringify(config), SESSION_TTL)
  configs.delete(phone)
  return config
}

export const delConfig = async (phone: string) => {
  const key = configKey(phone)
  await redisDel(key)
}

export const delAuth = async (phone: string) => {
  const key = authKey(phone)
  logger.trace(`Deleting key ${key}...`)
  await redisDel(key)
  logger.debug(`Deleted key ${key}!`)
  const pattern = authKey(`${phone}:*`)
  const keys = await redisKeys(pattern)
  logger.debug(`${keys.length} keys to delete auth for ${phone}`)
  for (let i = 0, j = keys.length; i < j; i++) {
    const key = keys[i]
    logger.trace(`Deleting key ${key}...`)
    await redisDel(key)
    logger.trace(`Deleted key ${key}!`)
  }
}

export const getAuth = async (phone: string, parse = (value: string) => JSON.parse(value)) => {
  const key = authKey(phone)
  const authString = await redisGet(key)
  if (authString) {
    const authJson = parse(authString)
    return authJson
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const setAuth = async (phone: string, value: any, stringify = (value: string) => JSON.stringify(value, null, '\t')) => {
  const key = authKey(phone)
  const authValue = stringify(value)
  return redisSetAndExpire(key, authValue, SESSION_TTL)
}

export const setbulkMessage = async (phone: string, bulkId: string, messageId: string, phoneNumber) => {
  const key = bulkMessageKey(phone, bulkId, messageId, phoneNumber)
  return redisSetAndExpire(key, 'scheduled', DATA_TTL)
}

export const getBulkReport = async (phone: string, id: string) => {
  const pattern = `${bulkMessageKeyBase(phone, id)}:*`
  const keys: string[] = await redisKeys(pattern)
  logger.debug(`keys: ${JSON.stringify(keys)}`)

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const report: any = await keys.reduce(async (accP: Promise<any>, key: string) => {
    const data = key.split(':')
    const messageId = data[3]
    const phoneNumber = data[4]
    const statusKey = messageStatusKey(phone, messageId)
    const acc = await accP
    acc[phoneNumber] = await redisGet(statusKey)
    return acc
  }, Promise.resolve({}))

  logger.debug(`Report: ${JSON.stringify(report)}`)

  const numbers = Object.keys(report)
  logger.debug(`numbers: ${JSON.stringify(numbers)}`)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const status = numbers.reduce((acc: any, number: string) => {
    const s = report[number]
    if (!acc[s]) {
      acc[s] = 0
    }
    acc[s] = acc[s] + 1
    return acc
  }, {})
  logger.debug(`status: ${JSON.stringify(status)}`)

  return { report, status }
}

export const getMessage = async <T>(phone: string, jid: string, id: string): Promise<T | undefined> => {
  const key = messageKey(phone, jid, id)
  const string = await redisGet(key)
  if (string) {
    const json = JSON.parse(string)
    return json
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const setMessage = async (phone: string, jid: string, id: string, value: any) => {
  const key = messageKey(phone, jid, id)
  const string = JSON.stringify(value)
  return redisSetAndExpire(key, string, DATA_TTL)
}

export const getProfilePicture = async (phone: string, jid: string) => {
  const key = profilePictureKey(phone, jid)
  return redisGet(key)
}

export const setProfilePicture = async (phone: string, jid: string, url: string) => {
  const key = profilePictureKey(phone, jid)
  return redisSetAndExpire(key, url, DATA_TTL)
}

export const getGroup = async (phone: string, jid: string) => {
  const key = groupKey(phone, jid)
  const group = await redisGet(key)
  if (group) {
    return JSON.parse(group) as GroupMetadata
  }
}

export const setGroup = async (phone: string, jid: string, data: GroupMetadata) => {
  const key = groupKey(phone, jid)
  return redisSetAndExpire(key, JSON.stringify(data), DATA_TTL)
}

export const getUnoId = async (phone: string, idBaileys: string) => {
  const key = unoIdKey(phone, idBaileys)
  return redisGet(key)
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const setUnoId = async (phone: string, idBaileys: string, idUno: string) => {
  const key = unoIdKey(phone, idBaileys)
  return redisSetAndExpire(key, idUno, DATA_TTL)
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const getKey = async (phone: string, id: string): Promise<any | undefined> => {
  const key = idKey(phone, id)
  const string = await redisGet(key)
  if (string) {
    const json = JSON.parse(string)
    return json
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const setKey = async (phone: string, id: string, value: any) => {
  const key = idKey(phone, id)
  const string = JSON.stringify(value)
  return redisSetAndExpire(key, string, DATA_TTL)
}
