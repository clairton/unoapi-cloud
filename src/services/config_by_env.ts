import { MessageFilter } from './message_filter'
import { getConfig, defaultConfig, Config, configs, Webhook } from './config'
import logger from './logger'
import { Level } from 'pino'

import {
  AUTO_RESTART_MS,
  AUTO_CONNECT,
  COMPOSING_MESSAGE,
  BASE_STORE,
  UNOAPI_RETRY_REQUEST_DELAY_MS,
  IGNORE_CALLS,
  REJECT_CALLS_WEBHOOK,
  MESSAGE_CALLS_WEBHOOK,
  WEBHOOK_SESSION,
  WEBHOOK_HEADER,
  WEBHOOK_URL,
  WEBHOOK_URL_ABSOLUTE,
  WEBHOOK_TOKEN,
  LOG_LEVEL,
  IGNORE_GROUP_MESSAGES,
  IGNORE_OWN_MESSAGES,
  IGNORE_BROADCAST_STATUSES,
  IGNORE_BROADCAST_MESSAGES,
  IGNORE_HISTORY_MESSAGES,
  IGNORE_YOURSELF_MESSAGES,
  SEND_CONNECTION_STATUS,
  IGNORE_DATA_STORE,
  THROW_WEBHOOK_ERROR,
  NOTIFY_FAILED_MESSAGES,
  SEND_REACTION_AS_REPLY,
  WEBHOOK_TIMEOUT_MS,
  SEND_PROFILE_PICTURE,
  WEBHOOK_SEND_NEW_MESSAGES,
  WEBHOOK_SEND_GROUP_MESSAGES,
  WEBHOOK_SEND_OUTGOING_MESSAGES,
  PROXY_URL,
  UNOAPI_AUTH_TOKEN,
  UNOAPI_HEADER_NAME,
  WAVOIP_TOKEN,
  READ_WHEN_RECEIPT,
} from '../defaults'

export const getConfigByEnv: getConfig = async (phone: string): Promise<Config> => {
  if (!configs.has(phone)) {
    const config: Config = { ...defaultConfig }
    config.logLevel = LOG_LEVEL as Level
    config.ignoreGroupMessages = IGNORE_GROUP_MESSAGES
    config.ignoreBroadcastStatuses = IGNORE_BROADCAST_STATUSES
    config.ignoreBroadcastMessages = IGNORE_BROADCAST_MESSAGES
    config.ignoreHistoryMessages = IGNORE_HISTORY_MESSAGES
    config.ignoreDataStore = IGNORE_DATA_STORE
    config.ignoreYourselfMessages = IGNORE_YOURSELF_MESSAGES
    config.ignoreOwnMessages = IGNORE_OWN_MESSAGES
    config.sendConnectionStatus = SEND_CONNECTION_STATUS
    config.autoConnect = AUTO_CONNECT
    config.autoRestartMs = AUTO_RESTART_MS
    config.composingMessage = COMPOSING_MESSAGE
    config.baseStore = BASE_STORE
    config.rejectCalls = IGNORE_CALLS
    config.rejectCallsWebhook = REJECT_CALLS_WEBHOOK
    config.messageCallsWebhook = MESSAGE_CALLS_WEBHOOK
    config.throwWebhookError = THROW_WEBHOOK_ERROR
    config.notifyFailedMessages = NOTIFY_FAILED_MESSAGES
    config.retryRequestDelayMs = UNOAPI_RETRY_REQUEST_DELAY_MS
    config.sendReactionAsReply = SEND_REACTION_AS_REPLY
    config.sendProfilePicture = SEND_PROFILE_PICTURE
    config.sessionWebhook = WEBHOOK_SESSION
    config.proxyUrl = PROXY_URL
    config.authToken = UNOAPI_AUTH_TOKEN
    config.authHeader = UNOAPI_HEADER_NAME
    config.wavoipToken = WAVOIP_TOKEN
    config.readWhenReceipt = READ_WHEN_RECEIPT
    config.useRedis = !!process.env.REDIS_URL
    config.useS3 = !!process.env.STORAGE_ENDPOINT
    config.webhooks[0].url = WEBHOOK_URL
    config.webhooks[0].urlAbsolute = WEBHOOK_URL_ABSOLUTE
    config.webhooks[0].token = WEBHOOK_TOKEN
    config.webhooks[0].header = WEBHOOK_HEADER
    config.webhooks[0].timeoutMs = WEBHOOK_TIMEOUT_MS
    config.webhooks[0].sendNewMessages = WEBHOOK_SEND_NEW_MESSAGES
    config.webhooks[0].sendGroupMessages = WEBHOOK_SEND_GROUP_MESSAGES
    config.webhooks[0].sendOutgoingMessages = WEBHOOK_SEND_OUTGOING_MESSAGES
    const filter: MessageFilter = new MessageFilter(phone, config)
    config.shouldIgnoreJid = filter.isIgnoreJid.bind(filter)
    config.shouldIgnoreKey = filter.isIgnoreKey.bind(filter)
    logger.info('Config by env: %s -> %s', phone, JSON.stringify(config))
    configs.set(phone, config)
  }
  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
  return configs.get(phone)!
}
