// security
export const UNOAPI_AUTH_TOKEN = process.env.UNOAPI_AUTH_TOKEN
export const UNOAPI_HEADER_NAME = process.env.UNOAPI_HEADER_NAME || 'Authorization'

export const LOG_LEVEL = process.env.LOG_LEVEL || (process.env.NODE_ENV == 'development' ? 'debug' : 'error')
export const UNO_LOG_LEVEL = process.env.UNO_LOG_LEVEL || LOG_LEVEL

// comunication
export const UNOAPI_URL = process.env.UNOAPI_URL || 'http://localhost:6789'
export const WEBHOOK_URL = process.env.WEBHOOK_URL || 'http://localhost:6789/webhooks/whatsapp'
export const WEBHOOK_HEADER = process.env.WEBHOOK_HEADER || 'Authorization'
export const WEBHOOK_TOKEN = process.env.WEBHOOK_TOKEN || '123abc'
export const WEBHOOK_SESSION = process.env.WEBHOOK_SESSION || ''
export const AMQP_URL = process.env.AMQP_URL || 'amqp://guest:guest@localhost:5672'
export const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379'

// behavior of unoapi
export const CONNECTION_TIMEOUT = process.env.CONNECTION_TIMEOUT || 140_000
export const QR_TIMEOUT = process.env.QR_TIMEOUT || 30_000
export const SLEEP_TIME = process.env.SLEEP_TIME || 500
export const MAX_QRCODE_GENERATE = process.env.MAX_QRCODE_GENERATE || 6
export const DATA_TTL: number = parseInt(process.env.DATA_TTL || `${60 * 60 * 24 * 7}`) // a week
export const DATA_JID_TTL: number = parseInt(process.env.DATA_JID_TTL || `${DATA_TTL / 7 / 24}`) // a day
export const SESSION_TTL: number = parseInt(process.env.SESSION_TTL || '-1')
export const UNOAPI_X_COUNT_RETRIES = process.env.UNOAPI_X_COUNT_RETRIES || 'x-unoapi-count-retries'
export const UNOAPI_X_MAX_RETRIES = process.env.UNOAPI_X_MAX_RETRIES || 'x-unoapi-max-retries'
export const UNOAPI_QUEUE_NAME = process.env.UNOAPI_QUEUE_NAME || 'unoapi'
export const UNOAPI_JOB_WEBHOOKER = `${UNOAPI_QUEUE_NAME}.webhooker`
export const UNOAPI_JOB_MEDIA = `${UNOAPI_QUEUE_NAME}.media`
export const UNOAPI_JOB_OUTGOING = `${UNOAPI_QUEUE_NAME}.outgoing`
export const UNOAPI_JOB_CONTACT = `${UNOAPI_QUEUE_NAME}.contact`
export const UNOAPI_JOB_BULK_PARSER = `${UNOAPI_QUEUE_NAME}.bulk.parser`
export const UNOAPI_JOB_BULK_SENDER = `${UNOAPI_QUEUE_NAME}.bulk.sender`
export const UNOAPI_JOB_BULK_STATUS = `${UNOAPI_QUEUE_NAME}.bulk.status`
export const UNOAPI_JOB_BULK_REPORT = `${UNOAPI_QUEUE_NAME}.bulk.report`
export const UNOAPI_JOB_BULK_WEBHOOK = `${UNOAPI_QUEUE_NAME}.bulk.webhook`
export const UNOAPI_JOB_COMMANDER = `${UNOAPI_QUEUE_NAME}.commander`
export const UNOAPI_JOB_INCOMING = `${UNOAPI_QUEUE_NAME}.incoming`
export const UNOAPI_JOB_REVOKER = `${UNOAPI_QUEUE_NAME}.revoker`
export const UNOAPI_MESSAGE_RETRY_LIMIT = parseInt(process.env.MESSAGE_RETRY_LIMIT || '5')
export const UNOAPI_MESSAGE_RETRY_DELAY = parseInt(process.env.MESSAGE_RETRY_DELAY || '10000')
export const UNOAPI_BULK_BATCH = parseInt(process.env.UNOAPI_BULK_BATCH || '5')
export const UNOAPI_BULK_DELAY = parseInt(process.env.UNOAPI_BULK_DELAY || '60')
export const UNOAPI_BULK_MESSAGE_DELAY = parseInt(process.env.UNOAPI_BULK_DELAY || '12')
export const PORT: number = parseInt(process.env.PORT || '9876')
export const BASE_URL = process.env.BASE_URL || `http://localhost:${PORT}`
export const IGNORE_CALLS = process.env.IGNORE_CALLS || ''
export const REJECT_CALLS = process.env.REJECT_CALLS || ''
export const REJECT_CALLS_WEBHOOK = process.env.REJECT_CALLS_WEBHOOK || ''

export const STORAGE_BUCKET_NAME = process.env.STORAGE_BUCKET_NAME || 'unoapi'
export const STORAGE_ACCESS_KEY_ID = process.env.STORAGE_ACCESS_KEY_ID || 'my-minio'
export const STORAGE_SECRET_ACCESS_KEY = process.env.STORAGE_SECRET_ACCESS_KEY || '2NVQWHTTT3asdasMgqapGchy6yAMZn'
export const STORAGE_REGION = process.env.STORAGE_REGION || 'us-east-1'
export const STORAGE_ENDPOINT = process.env.STORAGE_ENDPOINT || 'http://localhost:9000'
export const STORAGE_FORCE_PATH_STYLE = 'STORAGE_FORCE_PATH_STYLE' in process.env ? process.env.STORAGE_FORCE_PATH_STYLE : 'false'
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
  }
  if (forcePathStyle) {
    options.forcePathStyle = forcePathStyle
  }
  return options
}
