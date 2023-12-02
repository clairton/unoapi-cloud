import { MessageFilter } from './message_filter'
import { getConfig, defaultConfig, Config, ignoreGetGroupMetadata, getGroupMetadata } from './config'
import { getConfig as getConfigCache } from './redis'
import { getStoreRedis } from './store_redis'
import logger from './logger'
import { Level } from 'pino'

import { IGNORE_CALLS, REJECT_CALLS, REJECT_CALLS_WEBHOOK, LOG_LEVEL, WEBHOOK_TOKEN, WEBHOOK_HEADER, WEBHOOK_URL, WEBHOOK_SESSION } from '../defaults'

export const configs: Map<string, Config> = new Map()

const camelCase = (s: string) => s.toLowerCase().replace(/_(.)/g, (_s: string, c: string) => c.toUpperCase())

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const getValue = (configRedis: any, envKey: any) => {
  const key = camelCase(envKey)
  if (configRedis && key in configRedis) {
    return configRedis[key]
  }
  if (envKey in process.env) {
    if (process.env[envKey] == 'true') {
      return true
    } else if (process.env[envKey] == 'false') {
      return false
    }
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (defaultConfig as any)[key]
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export const getConfigRedis: getConfig = async (phone: string): Promise<Config> => {
  if (!configs.has(phone)) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const configRedis: any = await getConfigCache(phone)
    const config: Config = { ...defaultConfig }
    config.ignoreGroupMessages = getValue(configRedis, 'IGNORE_GROUP_MESSAGES')
    config.logLevel = (getValue(configRedis, 'LOG_LEVEL') || LOG_LEVEL) as Level
    config.ignoreBroadcastStatuses = getValue(configRedis, 'IGNORE_BROADCAST_STATUSES')
    config.ignoreBroadcastMessages = getValue(configRedis, 'IGNORE_BROADCAST_MESSAGES')
    config.ignoreHistoryMessages = getValue(configRedis, 'IGNORE_HISTORY_MESSAGES')
    config.ignoreYourselfMessages = getValue(configRedis, 'IGNORE_YOURSELF_MESSAGES')
    config.ignoreOwnMessages = getValue(configRedis, 'IGNORE_OWN_MESSAGES')
    config.sendConnectionStatus = getValue(configRedis, 'SEND_CONNECTION_STATUS')
    config.sessionWebhook = configRedis && 'sessionWebhook' in configRedis ? configRedis.sessionWebhook : WEBHOOK_SESSION || ''
    config.retryRequestDelayMs = getValue(configRedis, 'UNOAPI_RETRY_REQUEST_DELAY')
    config.rejectCalls = configRedis && 'rejectCalls' in configRedis ? configRedis.rejectCalls : IGNORE_CALLS || REJECT_CALLS || ''
    config.rejectCallsWebhook = configRedis && 'rejectCallsWebhook' in configRedis ? configRedis.rejectCallsWebhook : REJECT_CALLS_WEBHOOK || ''
    config.throwWebhookError = configRedis && 'throwWebhookError' in configRedis ? configRedis.throwWebhookError : true
    if (configRedis && configRedis.webhooks) {
      config.webhooks = configRedis.webhooks
    } else {
      config.webhooks = [{ url: WEBHOOK_URL, header: WEBHOOK_HEADER, token: WEBHOOK_TOKEN }]
    }

    const filter: MessageFilter = new MessageFilter(phone, config)

    config.shouldIgnoreJid = filter.isIgnoreJid.bind(filter)
    config.shouldIgnoreKey = filter.isIgnoreKey.bind(filter)
    config.getGroupMetadata = config.ignoreGroupMessages ? ignoreGetGroupMetadata : getGroupMetadata
    config.getStore = getStoreRedis
    logger.debug('Config: %s -> %s', phone, JSON.stringify(config))
    configs.set(phone, config)
  }
  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
  return configs.get(phone)!
}
