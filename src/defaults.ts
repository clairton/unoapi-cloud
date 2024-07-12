import { WAVersion } from "@whiskeysockets/baileys"

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const _undefined: any = undefined

// security
export const UNOAPI_AUTH_TOKEN = process.env.UNOAPI_AUTH_TOKEN
export const UNOAPI_HEADER_NAME = process.env.UNOAPI_HEADER_NAME || 'Authorization'

export const LOG_LEVEL = process.env.LOG_LEVEL || (process.env.NODE_ENV == 'development' ? 'debug' : 'error')
export const UNO_LOG_LEVEL = process.env.UNO_LOG_LEVEL || LOG_LEVEL

// comunication
export const UNOAPI_URL = process.env.UNOAPI_URL || 'http://localhost:6789'
export const WEBHOOK_URL_ABSOLUTE = process.env.WEBHOOK_URL_ABSOLUTE || ''
export const WEBHOOK_URL = process.env.WEBHOOK_URL || 'http://localhost:6789/webhooks/whatsapp'
export const WEBHOOK_HEADER = process.env.WEBHOOK_HEADER || 'Authorization'
export const WEBHOOK_TOKEN = process.env.WEBHOOK_TOKEN || '123abc'
export const WEBHOOK_TIMEOUT_MS = parseInt(process.env.WEBHOOK_TIMEOUT_MS || '5000')
export const CONSUMER_TIMEOUT_MS = parseInt(process.env.CONSUMER_TIMEOUT_MS || '30000')
export const WEBHOOK_SEND_NEW_MESSAGES = process.env.WEBHOOK_SEND_NEW_MESSAGES == _undefined ? false : process.env.WEBHOOK_SEND_NEW_MESSAGES == 'true'
export const WEBHOOK_SESSION = process.env.WEBHOOK_SESSION || ''
export const AMQP_URL = process.env.AMQP_URL || 'amqp://guest:guest@localhost:5672'
export const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379'
export const PROXY_URL = process.env.PROXY_URL

// behavior of unoapi
export const UNOAPI_SERVER_NAME = process.env.UNOAPI_SERVER_NAME || 'server_1'
export const CONNECTION_TIMEOUT = parseInt(process.env.CONNECTION_TIMEOUT || '140000')
export const UNOAPI_RETRY_REQUEST_DELAY_MS = parseInt(process.env.UNOAPI_RETRY_REQUEST_DELAY || process.env.UNOAPI_RETRY_REQUEST_DELAY_MS || '5000')
export const QR_TIMEOUT = parseInt(process.env.QR_TIMEOUT || '30000')
export const SLEEP_TIME = parseInt(process.env.SLEEP_TIME || '5000')
export const MAX_QRCODE_GENERATE = process.env.MAX_QRCODE_GENERATE || 6
export const DATA_TTL: number = parseInt(process.env.DATA_TTL || `${60 * 60 * 24 * 30}`) // a month
export const DATA_JID_TTL: number = parseInt(process.env.DATA_JID_TTL || `${60 * 60 * 24 * 7}`) // a week
export const SESSION_TTL: number = parseInt(process.env.SESSION_TTL || '-1')
export const UNOAPI_X_COUNT_RETRIES = process.env.UNOAPI_X_COUNT_RETRIES || 'x-unoapi-count-retries'
export const UNOAPI_X_MAX_RETRIES = process.env.UNOAPI_X_MAX_RETRIES || 'x-unoapi-max-retries'
export const UNOAPI_QUEUE_NAME = process.env.UNOAPI_QUEUE_NAME || 'unoapi'
export const UNOAPI_JOB_WEBHOOKER = `${UNOAPI_QUEUE_NAME}.webhooker`
export const UNOAPI_JOB_OUTGOING_PREFETCH = parseInt(process.env.UNOAPI_JOB_OUTGOING_PREFETCH || '1')
export const UNOAPI_JOB_MEDIA = `${UNOAPI_QUEUE_NAME}.media`
export const UNOAPI_JOB_NOTIFICATION = `${UNOAPI_QUEUE_NAME}.notification`
export const UNOAPI_JOB_LISTENER = `${UNOAPI_QUEUE_NAME}.baileys.listener`
export const UNOAPI_JOB_BLACKLIST_ADD = `${UNOAPI_QUEUE_NAME}.webhooker.blacklist.add`
export const UNOAPI_JOB_BLACKLIST_RELOAD = `${UNOAPI_QUEUE_NAME}.webhooker.blacklist.reload`
export const UNOAPI_JOB_BIND = `${UNOAPI_QUEUE_NAME}.bind`
export const UNOAPI_JOB_OUTGOING = `${UNOAPI_QUEUE_NAME}.outgoing`
export const UNOAPI_JOB_CONTACT = `${UNOAPI_QUEUE_NAME}.contact`
export const UNOAPI_JOB_BULK_PARSER = `${UNOAPI_QUEUE_NAME}.bulk.parser`
export const UNOAPI_JOB_RELOAD = `${UNOAPI_QUEUE_NAME}.reload`
export const UNOAPI_JOB_BROADCAST = `${UNOAPI_QUEUE_NAME}.broadcast`
export const UNOAPI_JOB_DISCONNECT = `${UNOAPI_QUEUE_NAME}.disconnect`
export const UNOAPI_JOB_BULK_SENDER = `${UNOAPI_QUEUE_NAME}.bulk.sender`
export const UNOAPI_JOB_BULK_STATUS = `${UNOAPI_QUEUE_NAME}.bulk.status`
export const UNOAPI_JOB_BULK_REPORT = `${UNOAPI_QUEUE_NAME}.bulk.report`
export const UNOAPI_JOB_BULK_WEBHOOK = `${UNOAPI_QUEUE_NAME}.bulk.webhook`
export const UNOAPI_JOB_COMMANDER = `${UNOAPI_QUEUE_NAME}.commander`
export const UNOAPI_JOB_INCOMING = `${UNOAPI_QUEUE_NAME}.incoming`
export const UNOAPI_JOB_REVOKER = `${UNOAPI_QUEUE_NAME}.revoker`
export const UNOAPI_MESSAGE_RETRY_LIMIT = parseInt(process.env.MESSAGE_RETRY_LIMIT || '5')
export const UNOAPI_MESSAGE_RETRY_DELAY = parseInt(process.env.MESSAGE_RETRY_DELAY || '10000')
export const UNOAPI_DELAY_BETWEEN_MESSAGES_MS = parseInt(process.env.UNOAPI_DELAY_BETWEEN_MESSAGES_MS || '0')
export const UNOAPI_DELAY_AFTER_FIRST_MESSAGE_MS = parseInt(process.env.UNOAPI_DELAY_AFTER_FIRST_MESSAGE_MS || '0')
export const UNOAPI_BULK_BATCH = parseInt(process.env.UNOAPI_BULK_BATCH || '5')
export const UNOAPI_BULK_DELAY = parseInt(process.env.UNOAPI_BULK_DELAY || '60')
export const UNOAPI_BULK_MESSAGE_DELAY = parseInt(process.env.UNOAPI_BULK_DELAY || '12')
export const PORT: number = parseInt(process.env.PORT || '9876')
export const BASE_URL = process.env.BASE_URL || `http://localhost:${PORT}`
export const IGNORE_CALLS = process.env.IGNORE_CALLS || ''
export const REJECT_CALLS = process.env.REJECT_CALLS || ''
export const REJECT_CALLS_WEBHOOK = process.env.REJECT_CALLS_WEBHOOK || ''
export const MESSAGE_CALLS_WEBHOOK = process.env.MESSAGE_CALLS_WEBHOOK || ''
export const AUTO_RESTART_MS = parseInt(process.env.AUTO_RESTART_MS || '0')
export const BASE_STORE = process.env.UNOAPI_BASE_STORE || process.env.BASE_STORE || './data'
export const AUTO_CONNECT: boolean = process.env.AUTO_CONNECT === _undefined ? true : process.env.AUTO_CONNECT == 'true'
export const COMPOSING_MESSAGE: boolean = process.env.COMPOSING_MESSAGE === _undefined ? false : process.env.COMPOSING_MESSAGE == 'true'
export const IGNORE_GROUP_MESSAGES: boolean = process.env.IGNORE_GROUP_MESSAGES == _undefined ? true : process.env.IGNORE_GROUP_MESSAGES == 'true'
export const IGNORE_BROADCAST_STATUSES: boolean =
  process.env.IGNORE_BROADCAST_STATUSES === _undefined ? true : process.env.IGNORE_BROADCAST_STATUSES == 'true'
export const IGNORE_BROADCAST_MESSAGES: boolean =
  process.env.IGNORE_BROADCAST_MESSAGES === _undefined ? false : process.env.IGNORE_OWN_MESSAGES == 'true'
export const IGNORE_HISTORY_MESSAGES: boolean =
  process.env.IGNORE_HISTORY_MESSAGES === _undefined ? true : process.env.IGNORE_HISTORY_MESSAGES == 'true'
export const IGNORE_DATA_STORE: boolean = process.env.IGNORE_DATA_STORE === _undefined ? false : process.env.IGNORE_DATA_STORE == 'true'
export const IGNORE_YOURSELF_MESSAGES: boolean =
  process.env.IGNORE_YOURSELF_MESSAGES === _undefined ? false : process.env.IGNORE_YOURSELF_MESSAGES == 'true'
export const IGNORE_OWN_MESSAGES: boolean = process.env.IGNORE_OWN_MESSAGES === _undefined ? true : process.env.IGNORE_OWN_MESSAGES == 'true'
export const SEND_CONNECTION_STATUS: boolean = process.env.SEND_CONNECTION_STATUS === _undefined ? true : process.env.SEND_CONNECTION_STATUS == 'true'
export const NOTIFY_FAILED_MESSAGES: boolean = process.env.NOTIFY_FAILED_MESSAGES === _undefined ? true : process.env.NOTIFY_FAILED_MESSAGES == 'true'
export const THROW_WEBHOOK_ERROR: boolean = process.env.THROW_WEBHOOK_ERROR === _undefined ? false : process.env.THROW_WEBHOOK_ERROR == 'true'
export const SEND_REACTION_AS_REPLY: boolean =
  process.env.SEND_REACTION_AS_REPLY === _undefined ? false : process.env.SEND_REACTION_AS_REPLY == 'true'
export const STORAGE_BUCKET_NAME = process.env.STORAGE_BUCKET_NAME || 'unoapi'
export const STORAGE_ACCESS_KEY_ID = process.env.STORAGE_ACCESS_KEY_ID || 'my-minio'
export const STORAGE_SECRET_ACCESS_KEY = process.env.STORAGE_SECRET_ACCESS_KEY || '2NVQWHTTT3asdasMgqapGchy6yAMZn'
export const STORAGE_REGION = process.env.STORAGE_REGION || 'us-east-1'
export const STORAGE_TIMEOUT_MS = parseInt(process.env.STORAGE_TIMEOUT_MS || '30000')
export const STORAGE_ENDPOINT = process.env.STORAGE_ENDPOINT || 'http://localhost:9000'
export const STORAGE_FORCE_PATH_STYLE: boolean =
  process.env.STORAGE_FORCE_PATH_STYLE === _undefined ? false : process.env.STORAGE_FORCE_PATH_STYLE == 'true'
export const SEND_PROFILE_PICTURE: boolean = process.env.SEND_PROFILE_PICTURE === _undefined ? true : process.env.SEND_PROFILE_PICTURE == 'true'
export const IGNORED_CONNECTIONS_NUMBERS = JSON.parse(process.env.IGNORED_CONNECTIONS_NUMBERS || '[]')
export const CLEAN_CONFIG_ON_DISCONNECT =
  process.env.CLEAN_CONFIG_ON_DISCONNECT === _undefined ? false : process.env.CLEAN_CONFIG_ON_DISCONNECT == 'true'
export const VALIDATE_ROUTING_KEY = process.env.VALIDATE_ROUTING_KEY === _undefined ? false : process.env.VALIDATE_ROUTING_KEY == 'true'
export const CONFIG_SESSION_PHONE_CLIENT = process.env.CONFIG_SESSION_PHONE_CLIENT || 'Unoapi'
export const CONFIG_SESSION_PHONE_NAME = process.env.CONFIG_SESSION_PHONE_NAME || 'Chrome'
export const WHATSAPP_VERSION = JSON.parse(process.env.WHATSAPP_VERSION || '[2, 2413, 1]') as WAVersion

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const STORAGE_OPTIONS = (storage: any) => {
  storage = storage || { credentials: {} }
  const forcePathStyle = JSON.parse('forcePathStyle' in storage ? storage.forcePathStyle : STORAGE_FORCE_PATH_STYLE)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const options: any = {
    region: storage.region || STORAGE_REGION,
    endpoint: storage.endpoint || STORAGE_ENDPOINT,
    credentials: {
      accessKeyId: storage.credentials?.accessKeyId || STORAGE_ACCESS_KEY_ID,
      secretAccessKey: storage.credentials?.secretAccessKey || STORAGE_SECRET_ACCESS_KEY,
    },
    bucket: storage?.bucket || STORAGE_BUCKET_NAME,
    signatureVersion: 's3v4',
    timeoutMs: STORAGE_TIMEOUT_MS,
  }
  if (forcePathStyle) {
    options.forcePathStyle = forcePathStyle
  }
  return options
}
