import { WAVersion } from '@whiskeysockets/baileys'
import { release } from 'os'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const _undefined: any = undefined

// security
export const UNOAPI_AUTH_TOKEN = process.env.UNOAPI_AUTH_TOKEN
export const OPENAI_API_KEY = process.env.OPENAI_API_KEY
export const OPENAI_API_ASSISTANT_ID = process.env.OPENAI_API_ASSISTANT_ID
export const OPENAI_API_TRANSCRIBE_MODEL = process.env.OPENAI_API_TRANSCRIBE_MODEL || 'whisper-1'
export const GROQ_API_KEY = process.env.GROQ_API_KEY
export const GROQ_API_TRANSCRIBE_MODEL = process.env.GROQ_API_TRANSCRIBE_MODEL || 'whisper-large-v3'
export const GROQ_API_BASE_URL = process.env.GROQ_API_BASE_URL || 'https://api.groq.com/openai/v1'
export const UNOAPI_HEADER_NAME = process.env.UNOAPI_HEADER_NAME || 'Authorization'

export const LOG_LEVEL = process.env.LOG_LEVEL || (process.env.NODE_ENV == 'development' ? 'debug' : 'error')
export const UNO_LOG_LEVEL = process.env.UNO_LOG_LEVEL || LOG_LEVEL

export const DEFAULT_LOCALE = process.env.DEFAULT_LOCALE || 'en'

export const VALIDATE_MEDIA_LINK_BEFORE_SEND = 
  process.env.VALIDATE_MEDIA_LINK_BEFORE_SEND == _undefined ? false : process.env.VALIDATE_MEDIA_LINK_BEFORE_SEND == 'false'
export const SEND_AUDIO_MESSAGE_AS_PTT = 
  process.env.SEND_AUDIO_MESSAGE_AS_PTT == _undefined ? true : process.env.SEND_AUDIO_MESSAGE_AS_PTT == 'true'
// Whether to actually convert audio media to OGG/Opus when sending as PTT.
// Defaults to the same value as SEND_AUDIO_MESSAGE_AS_PTT for backward compatibility.
export const CONVERT_AUDIO_TO_PTT =
  process.env.CONVERT_AUDIO_TO_PTT == _undefined ? SEND_AUDIO_MESSAGE_AS_PTT : process.env.CONVERT_AUDIO_TO_PTT == 'true'
// Align with original behavior: gate conversion explicitly and allow ffmpeg params + waveform
export const CONVERT_AUDIO_MESSAGE_TO_OGG =
  process.env.CONVERT_AUDIO_MESSAGE_TO_OGG == _undefined ? true : process.env.CONVERT_AUDIO_MESSAGE_TO_OGG == 'true'
export const CONVERT_AUDIO_FFMPEG_PARAMS = JSON.parse(
  process.env.CONVERT_AUDIO_FFMPEG_PARAMS ||
    '["-vn","-ar","48000","-ac","1","-c:a","libopus","-b:a","64k","-application","voip","-avoid_negative_ts","make_zero","-map_metadata","-1","-f","ogg"]'
)
export const SEND_AUDIO_WAVEFORM =
  process.env.SEND_AUDIO_WAVEFORM == _undefined ? true : process.env.SEND_AUDIO_WAVEFORM == 'true'
export const AUDIO_WAVEFORM_SAMPLES = parseInt(process.env.AUDIO_WAVEFORM_SAMPLES || '97')
export const UNOAPI_NATIVE_FLOW_BUTTONS: boolean =
  process.env.UNOAPI_NATIVE_FLOW_BUTTONS == _undefined ? true : process.env.UNOAPI_NATIVE_FLOW_BUTTONS == 'true'
export const UNOAPI_DEBUG_BAILEYS_LIST_DUMP =
  process.env.UNOAPI_DEBUG_BAILEYS_LIST_DUMP == _undefined ? false : process.env.UNOAPI_DEBUG_BAILEYS_LIST_DUMP == 'true'

// Convert downloaded audio (e.g., OGG/OGA/OPUS) to MP3 before storing/sending (iOS Safari compatibility)
export const DOWNLOAD_AUDIO_CONVERT_TO_MP3 = process.env.DOWNLOAD_AUDIO_CONVERT_TO_MP3 == _undefined ? false : process.env.DOWNLOAD_AUDIO_CONVERT_TO_MP3 == 'true'
export const DOWNLOAD_AUDIO_FFMPEG_MP3_PARAMS = JSON.parse(
  process.env.DOWNLOAD_AUDIO_FFMPEG_MP3_PARAMS ||
    '["-vn","-ar","48000","-ac","1","-c:a","libmp3lame","-b:a","128k","-map_metadata","-1","-f","mp3"]'
)

export const WEBHOOK_FORWARD_PHONE_NUMBER_ID = process.env.WEBHOOK_FORWARD_PHONE_NUMBER_ID || ''
export const WEBHOOK_FORWARD_BUSINESS_ACCOUNT_ID = process.env.WEBHOOK_FORWARD_BUSINESS_ACCOUNT_ID || ''
export const WEBHOOK_FORWARD_TOKEN = process.env.WEBHOOK_FORWARD_TOKEN || ''
export const WEBHOOK_FORWARD_VERSION = process.env.WEBHOOK_FORWARD_VERSION || 'v17.0'
export const WEBHOOK_FORWARD_URL = process.env.WEBHOOK_FORWARD_URL || 'https://graph.facebook.com'
export const WEBHOOK_FORWARD_TIMEOUT_MS = parseInt(process.env.WEBHOOK_TIMEOUT_MS || '6000')

// comunication
export const UNOAPI_URL = process.env.UNOAPI_URL || 'http://localhost:9876'
export const WEBHOOK_URL_ABSOLUTE = process.env.WEBHOOK_URL_ABSOLUTE || ''
export const WEBHOOK_URL = process.env.WEBHOOK_URL || 'http://localhost:9876/webhooks/fake'
export const WEBHOOK_HEADER = process.env.WEBHOOK_HEADER || 'Authorization'
export const WEBHOOK_TOKEN = process.env.WEBHOOK_TOKEN || UNOAPI_AUTH_TOKEN || '123abc'
export const WEBHOOK_TIMEOUT_MS = parseInt(process.env.WEBHOOK_TIMEOUT_MS || '6000')
export const FETCH_TIMEOUT_MS = parseInt(process.env.FETCH_TIMEOUT_MS || '6000')
export const CONNECTION_TYPE = process.env.CONNECTION_TYPE || 'qrcode'

export const CONSUMER_TIMEOUT_MS = parseInt(process.env.CONSUMER_TIMEOUT_MS || '15000')
export const WEBHOOK_SEND_NEW_MESSAGES = process.env.WEBHOOK_SEND_NEW_MESSAGES == _undefined ? false : process.env.WEBHOOK_SEND_NEW_MESSAGES == 'true'
export const WEBHOOK_SEND_INCOMING_MESSAGES = process.env.WEBHOOK_SEND_INCOMING_MESSAGES == _undefined ? true : process.env.WEBHOOK_SEND_INCOMING_MESSAGES == 'true'
export const WEBHOOK_SEND_GROUP_MESSAGES = process.env.WEBHOOK_SEND_GROUP_MESSAGES == _undefined ? true : process.env.WEBHOOK_SEND_GROUP_MESSAGES == 'true'
export const WEBHOOK_SEND_OUTGOING_MESSAGES =
  process.env.WEBHOOK_SEND_OUTGOING_MESSAGES == _undefined ? true : process.env.WEBHOOK_SEND_OUTGOING_MESSAGES == 'true'
export const WEBHOOK_SEND_TRANSCRIBE_AUDIO =
  process.env.WEBHOOK_SEND_TRANSCRIBE_AUDIO == _undefined ? false : process.env.WEBHOOK_SEND_TRANSCRIBE_AUDIO == 'true'
export const WEBHOOK_SEND_UPDATE_MESSAGES =
  process.env.WEBHOOK_SEND_UPDATE_MESSAGES == _undefined ? true : process.env.WEBHOOK_SEND_UPDATE_MESSAGES == 'true'
export const WEBHOOK_SEND_NEWSLETTER_MESSAGES =
  process.env.WEBHOOK_SEND_NEWSLETTER_MESSAGES == _undefined ? false : process.env.WEBHOOK_SEND_NEWSLETTER_MESSAGES == 'true'
export const WEBHOOK_ADD_TO_BLACKLIST_ON_OUTGOING_MESSAGE_WITH_TTL =
  process.env.WEBHOOK_ADD_TO_BLACKLIST_ON_OUTGOING_MESSAGE_WITH_TTL == _undefined ? undefined : parseInt(process.env.WEBHOOK_ADD_TO_BLACKLIST_ON_OUTGOING_MESSAGE_WITH_TTL!)
export const WEBHOOK_INCLUDE_MEDIA_DATA =
  process.env.WEBHOOK_INCLUDE_MEDIA_DATA == _undefined ? false : process.env.WEBHOOK_INCLUDE_MEDIA_DATA == 'true'
export const WEBHOOK_ASYNC =
  process.env.WEBHOOK_ASYNC == _undefined ? true : process.env.WEBHOOK_ASYNC == 'true'
export const WEBHOOK_ASYNC_MODE = process.env.WEBHOOK_ASYNC_MODE || 'amqp'
export const WEBHOOK_SESSION = process.env.WEBHOOK_SESSION || ''
// Webhook circuit breaker (fail fast when endpoints are offline)
export const WEBHOOK_CB_ENABLED =
  process.env.WEBHOOK_CB_ENABLED == _undefined ? true : process.env.WEBHOOK_CB_ENABLED == 'true'
export const WEBHOOK_CB_FAILURE_THRESHOLD = parseInt(process.env.WEBHOOK_CB_FAILURE_THRESHOLD || '1')
export const WEBHOOK_CB_OPEN_MS = parseInt(process.env.WEBHOOK_CB_OPEN_MS || '120000')
export const WEBHOOK_CB_FAILURE_TTL_MS = parseInt(process.env.WEBHOOK_CB_FAILURE_TTL_MS || '300000')
export const WEBHOOK_CB_REQUEUE_DELAY_MS = parseInt(process.env.WEBHOOK_CB_REQUEUE_DELAY_MS || '300000')
export const WEBHOOK_CB_LOCAL_CLEANUP_INTERVAL_MS = parseInt(process.env.WEBHOOK_CB_LOCAL_CLEANUP_INTERVAL_MS || '3600000')
export const CONTACT_SYNC_ENABLED =
  process.env.CONTACT_SYNC_ENABLED == _undefined ? false : process.env.CONTACT_SYNC_ENABLED == 'true'
export const CONTACT_SYNC_INTERVAL_MS = parseInt(process.env.CONTACT_SYNC_INTERVAL_MS || `${8 * 60 * 60 * 1000}`)
export const CONTACT_SYNC_SCAN_COUNT = parseInt(process.env.CONTACT_SYNC_SCAN_COUNT || '500')
export const CONTACT_SYNC_PENDING_TTL_SEC = parseInt(process.env.CONTACT_SYNC_PENDING_TTL_SEC || '900')
export const CONTACT_SYNC_PENDING_POLL_MS = parseInt(process.env.CONTACT_SYNC_PENDING_POLL_MS || '60000')
export const AMQP_URL = process.env.AMQP_URL || 'amqp://guest:guest@localhost:5672'
export const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379'
// Opcional: força uso de SCAN no redisKeys (se falso, usa KEYS nos prefixos críticos)
export const REDIS_KEYS_USE_SCAN = process.env.REDIS_KEYS_USE_SCAN === _undefined ? false : process.env.REDIS_KEYS_USE_SCAN === 'true'
// TTL (ms) para cache local de config por sessao. 0 desabilita TTL (usa apenas invalidacao por pub/sub).
export const CONFIG_CACHE_TTL_MS = parseInt(process.env.CONFIG_CACHE_TTL_MS || '0')
// TTLs (ms) para cache local de sessao/auth (0 = somente invalidacao por pub/sub)
export const AUTH_CACHE_TTL_MS = parseInt(process.env.AUTH_CACHE_TTL_MS || '5000')
export const SESSION_STATUS_CACHE_TTL_MS = parseInt(process.env.SESSION_STATUS_CACHE_TTL_MS || '5000')
export const CONNECT_COUNT_CACHE_TTL_MS = parseInt(process.env.CONNECT_COUNT_CACHE_TTL_MS || '2000')
export const PROXY_URL = process.env.PROXY_URL

// behavior of unoapi
export const UNOAPI_SERVER_NAME = process.env.UNOAPI_SERVER_NAME || 'server_1'
export const CONNECTING_TIMEOUT_MS = parseInt(process.env.CONNECTING_TIMEOUT_MS || '180000')
export const UNOAPI_RETRY_REQUEST_DELAY_MS = parseInt(process.env.UNOAPI_RETRY_REQUEST_DELAY || process.env.UNOAPI_RETRY_REQUEST_DELAY_MS || '5000')
// export const QR_TIMEOUT = parseInt(process.env.QR_TIMEOUT || '30000')
// export const SLEEP_TIME = parseInt(process.env.SLEEP_TIME || '5000')
// export const MAX_QRCODE_GENERATE = process.env.MAX_QRCODE_GENERATE || 6
export const DATA_TTL: number = parseInt(process.env.DATA_TTL || `${60 * 60 * 24 * 30}`) // a month
export const DATA_URL_TTL: number = parseInt(process.env.DATA_URL_TTL || `${60 * 60 * 24 * 3}`) // tree days
export const SESSION_TTL: number = parseInt(process.env.SESSION_TTL || '-1')
export const UNOAPI_X_COUNT_RETRIES: string = process.env.UNOAPI_X_COUNT_RETRIES || 'x-unoapi-count-retries'
export const UNOAPI_X_MAX_RETRIES: string = process.env.UNOAPI_X_MAX_RETRIES || 'x-unoapi-max-retries'
export const UNOAPI_EXCHANGE_NAME = process.env.UNOAPI_EXCHANGE_NAME || 'unoapi'
export const UNOAPI_EXCHANGE_BROKER_NAME =`${UNOAPI_EXCHANGE_NAME}.broker`
export const UNOAPI_EXCHANGE_BRIDGE_NAME = `${UNOAPI_EXCHANGE_NAME}.brigde`
export const UNOAPI_QUEUE_NAME = process.env.UNOAPI_QUEUE_NAME || 'unoapi'
export const UNOAPI_QUEUE_OUTGOING_PREFETCH = parseInt(process.env.UNOAPI_QUEUE_OUTGOING_PREFETCH || '4')
export const UNOAPI_QUEUE_DELAYED = `${UNOAPI_QUEUE_NAME}.delayed`
export const UNOAPI_QUEUE_WEBHOOK_STATUS_FAILED = `${UNOAPI_QUEUE_NAME}.webhook.status.failed`
export const UNOAPI_QUEUE_MEDIA = `${UNOAPI_QUEUE_NAME}.media`
export const UNOAPI_QUEUE_NOTIFICATION = `${UNOAPI_QUEUE_NAME}.notification`
export const UNOAPI_QUEUE_LISTENER = `${UNOAPI_QUEUE_NAME}.listener`
export const UNOAPI_QUEUE_BLACKLIST_ADD = `${UNOAPI_QUEUE_NAME}.blacklist.add`
export const UNOAPI_QUEUE_BLACKLIST_RELOAD = `${UNOAPI_QUEUE_NAME}.blacklist.reload`
export const UNOAPI_QUEUE_BIND = `${UNOAPI_QUEUE_NAME}.bind`
export const UNOAPI_QUEUE_TIMER = `${UNOAPI_QUEUE_NAME}.timer`
export const UNOAPI_QUEUE_OUTGOING = `${UNOAPI_QUEUE_NAME}.outgoing`
export const UNOAPI_QUEUE_CONTACT = `${UNOAPI_QUEUE_NAME}.contact`
export const UNOAPI_QUEUE_BULK_PARSER = `${UNOAPI_QUEUE_NAME}.bulk.parser`
export const UNOAPI_QUEUE_RELOAD = `${UNOAPI_QUEUE_NAME}.reload`
export const UNOAPI_QUEUE_BROADCAST = `${UNOAPI_QUEUE_NAME}.broadcast`
export const UNOAPI_QUEUE_LOGOUT = `${UNOAPI_QUEUE_NAME}.logout`
export const UNOAPI_QUEUE_BULK_SENDER = `${UNOAPI_QUEUE_NAME}.bulk.sender`
export const UNOAPI_QUEUE_BULK_STATUS = `${UNOAPI_QUEUE_NAME}.bulk.status`
export const UNOAPI_QUEUE_BULK_REPORT = `${UNOAPI_QUEUE_NAME}.bulk.report`
export const UNOAPI_QUEUE_BULK_WEBHOOK = `${UNOAPI_QUEUE_NAME}.bulk.webhook`
export const UNOAPI_QUEUE_COMMANDER = `${UNOAPI_QUEUE_NAME}.commander`
export const UNOAPI_QUEUE_INCOMING = `${UNOAPI_QUEUE_NAME}.incoming`
export const UNOAPI_QUEUE_TRANSCRIBER = `${UNOAPI_QUEUE_NAME}.transcribe`
export const RELOAD_PUBLISH_BROKER = process.env.RELOAD_PUBLISH_BROKER === _undefined ? false : process.env.RELOAD_PUBLISH_BROKER == 'true'
export const RELOAD_BAILEYS_DEBOUNCE_MS = parseInt(process.env.RELOAD_BAILEYS_DEBOUNCE_MS || '15000')
export const UNOAPI_MESSAGE_RETRY_LIMIT = parseInt(process.env.UNOAPI_MESSAGE_RETRY_LIMIT || '5')
export const UNOAPI_MESSAGE_RETRY_DELAY = parseInt(process.env.UNOAPI_MESSAGE_RETRY_DELAY || '10000')
export const UNOAPI_DELAY_BETWEEN_MESSAGES_MS = parseInt(process.env.UNOAPI_DELAY_BETWEEN_MESSAGES_MS || '0')
export const UNOAPI_DELAY_AFTER_FIRST_MESSAGE_MS = parseInt(process.env.UNOAPI_DELAY_AFTER_FIRST_MESSAGE_MS || '0')
export const UNOAPI_DELAY_AFTER_FIRST_MESSAGE_WEBHOOK_MS = parseInt(process.env.UNOAPI_DELAY_AFTER_FIRST_MESSAGE_WEBHOOK_MS || '0')
export const CUSTOM_MESSAGE_CHARACTERS = JSON.parse(process.env.CUSTOM_MESSAGE_CHARACTERS || '[]')
export const UNOAPI_BULK_BATCH = parseInt(process.env.UNOAPI_BULK_BATCH || '5')
export const UNOAPI_BULK_DELAY = parseInt(process.env.UNOAPI_BULK_DELAY || '60')
export const MAX_CONNECT_RETRY = parseInt(process.env.MAX_CONNECT_RETRY || '3')
export const MAX_CONNECT_TIME = parseInt(process.env.MAX_CONNECT_TIME || '300')
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
export const COEXISTENCE_ENABLED: boolean = process.env.COEXISTENCE_ENABLED === _undefined ? false : process.env.COEXISTENCE_ENABLED == 'true'
export const COEXISTENCE_WINDOW_SECONDS: number = parseInt(process.env.COEXISTENCE_WINDOW_SECONDS || `${60 * 60 * 24}`)
export const IGNORE_GROUP_MESSAGES: boolean = process.env.IGNORE_GROUP_MESSAGES == _undefined ? true : process.env.IGNORE_GROUP_MESSAGES == 'true'
export const IGNORE_NEWSLETTER_MESSAGES: boolean = process.env.IGNORE_NEWSLETTER_MESSAGES == _undefined ? true : process.env.IGNORE_NEWSLETTER_MESSAGES == 'true'
export const IGNORE_BROADCAST_STATUSES: boolean =
  process.env.IGNORE_BROADCAST_STATUSES === _undefined ? true : process.env.IGNORE_BROADCAST_STATUSES == 'true'
export const READ_ON_RECEIPT: boolean = process.env.READ_ON_RECEIPT === _undefined ? false : process.env.READ_ON_RECEIPT == 'true'
// Marca como lida ao responder (por sessão)
export const READ_ON_REPLY: boolean = process.env.READ_ON_REPLY === _undefined ? false : process.env.READ_ON_REPLY == 'true'
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
export const STORAGE_TIMEOUT_MS = parseInt(process.env.STORAGE_TIMEOUT_MS || '1200000')
export const STORAGE_ENDPOINT = process.env.STORAGE_ENDPOINT || 'http://localhost:9000'
export const STORAGE_FORCE_PATH_STYLE: boolean =
  process.env.STORAGE_FORCE_PATH_STYLE === _undefined ? false : process.env.STORAGE_FORCE_PATH_STYLE == 'true'
// S3 client retry attempts
export const STORAGE_MAX_ATTEMPTS = parseInt(process.env.STORAGE_MAX_ATTEMPTS || '3')

// Purga opcional de device-list no watchdog (para forçar reenumeração de devices)
export const SIGNAL_PURGE_DEVICE_LIST_ENABLED =
  process.env.SIGNAL_PURGE_DEVICE_LIST_ENABLED === _undefined ? false : process.env.SIGNAL_PURGE_DEVICE_LIST_ENABLED == 'true'
// Controla purga de sessões libsignal (session-*) no watchdog. Padrão false para preservar sessões boas
export const SIGNAL_PURGE_SESSION_ENABLED =
  process.env.SIGNAL_PURGE_SESSION_ENABLED === _undefined ? false : process.env.SIGNAL_PURGE_SESSION_ENABLED == 'true'
// Controla purga de sender-keys (sender-key-*) no watchdog. Padrão false para preservar chaves de grupos
export const SIGNAL_PURGE_SENDER_KEY_ENABLED =
  process.env.SIGNAL_PURGE_SENDER_KEY_ENABLED === _undefined ? false : process.env.SIGNAL_PURGE_SENDER_KEY_ENABLED == 'true'
export const SEND_PROFILE_PICTURE: boolean = process.env.SEND_PROFILE_PICTURE === _undefined ? true : process.env.SEND_PROFILE_PICTURE != 'false'
// Force refresh of profile pictures from WhatsApp even if a cached copy exists in storage
export const PROFILE_PICTURE_FORCE_REFRESH: boolean =
  process.env.PROFILE_PICTURE_FORCE_REFRESH === _undefined ? true : process.env.PROFILE_PICTURE_FORCE_REFRESH == 'true'
// Tempo mínimo entre atualizações forçadas de foto de perfil (segundos). Padrão 24h.
export const PROFILE_PICTURE_REFRESH_INTERVAL_SEC = parseInt(process.env.PROFILE_PICTURE_REFRESH_INTERVAL_SEC || `${60 * 60 * 24}`)
export const IGNORED_CONNECTIONS_NUMBERS = JSON.parse(process.env.IGNORED_CONNECTIONS_NUMBERS || '[]')
export const IGNORED_TO_NUMBERS = JSON.parse(process.env.IGNORED_TO_NUMBERS || '[]')
export const CLEAN_CONFIG_ON_DISCONNECT =
  process.env.CLEAN_CONFIG_ON_DISCONNECT === _undefined ? false : process.env.CLEAN_CONFIG_ON_DISCONNECT == 'true'
export const VALIDATE_ROUTING_KEY = process.env.VALIDATE_ROUTING_KEY === _undefined ? false : process.env.VALIDATE_ROUTING_KEY == 'true'
export const CONFIG_SESSION_PHONE_CLIENT = process.env.CONFIG_SESSION_PHONE_CLIENT || 'Unoapi'
export const CONFIG_SESSION_PHONE_NAME = process.env.CONFIG_SESSION_PHONE_NAME || 'Chrome'
export const MESSAGE_CHECK_WAAPP = process.env.MESSAGE_CHECK_WAAPP || ''
export const WHATSAPP_VERSION = process.env.WHATSAPP_VERSION ? JSON.parse(process.env.WHATSAPP_VERSION) as WAVersion : undefined
export const AVAILABLE_LOCALES = JSON.parse(process.env.AVAILABLE_LOCALES || '["en", "pt_BR", "pt"]')
export const BAILEYS_COUNTRY_CODE = (process.env.BAILEYS_COUNTRY_CODE || 'BR').toUpperCase()
export const ONLY_HELLO_TEMPLATE: boolean = process.env.ONLY_HELLO_TEMPLATE === _undefined ? false : process.env.ONLY_HELLO_TEMPLATE == 'true'
export const DEFAULT_BROWSER = [CONFIG_SESSION_PHONE_CLIENT, CONFIG_SESSION_PHONE_NAME, release()]

// Embedded Signup (WhatsApp Cloud)
export const EMBEDDED_SIGNUP_APP_ID = process.env.EMBEDDED_SIGNUP_APP_ID || ''
export const EMBEDDED_SIGNUP_APP_SECRET = process.env.EMBEDDED_SIGNUP_APP_SECRET || ''
export const EMBEDDED_SIGNUP_REDIRECT_URI = process.env.EMBEDDED_SIGNUP_REDIRECT_URI || ''
export const EMBEDDED_SIGNUP_GRAPH_VERSION = process.env.EMBEDDED_SIGNUP_GRAPH_VERSION || 'v24.0'
export const QR_TIMEOUT_MS = parseInt(process.env.QR_TIMEOUT_MS || '60000')
export const QR_POST_LOGIN_SUPPRESS_MS = parseInt(process.env.QR_POST_LOGIN_SUPPRESS_MS || '45000')
export const STATUS_FAILED_WEBHOOK_URL = process.env.STATUS_FAILED_WEBHOOK_URL || ''
// Status broadcast behavior
export const STATUS_ALLOW_LID: boolean = process.env.STATUS_ALLOW_LID === _undefined ? true : process.env.STATUS_ALLOW_LID == 'true'
// Enable/disable sending Status (status@broadcast). When disabled, outgoing status
// messages are rejected before reaching WhatsApp to avoid potential account risk.
export const STATUS_BROADCAST_ENABLED: boolean =
  process.env.STATUS_BROADCAST_ENABLED === _undefined ? true : process.env.STATUS_BROADCAST_ENABLED == 'true'

export const VALIDATE_SESSION_NUMBER: boolean =
  process.env.VALIDATE_SESSION_NUMBER === _undefined ? false : process.env.VALIDATE_SESSION_NUMBER == 'true'

// Limit for history sync (in days). When history import is enabled, only messages
// newer than this window are forwarded to processing/webhooks. Default 30 days.
export const HISTORY_MAX_AGE_DAYS = parseInt(process.env.HISTORY_MAX_AGE_DAYS || '30')

// Group sending safeguards
// Validate membership before sending to a group (recommended)
export const GROUP_SEND_MEMBERSHIP_CHECK =
  process.env.GROUP_SEND_MEMBERSHIP_CHECK == _undefined ? true : process.env.GROUP_SEND_MEMBERSHIP_CHECK == 'true'
// Optional: prefer addressing mode when sending to groups. Allowed values: 'pn' | 'lid'.
// Leave unset to let Baileys decide.
// Prefer LID for group sends by default; can be overridden via env.
export const GROUP_SEND_ADDRESSING_MODE = (process.env.GROUP_SEND_ADDRESSING_MODE || 'lid').toLowerCase() as 'pn' | 'lid' | ''
// Pre-assert sessions for all group participants before sending to reduce ack 421
export const GROUP_SEND_PREASSERT_SESSIONS =
  process.env.GROUP_SEND_PREASSERT_SESSIONS == _undefined ? false : process.env.GROUP_SEND_PREASSERT_SESSIONS == 'true'
// Auto-retry once on 421 toggling addressing mode order (comma-separated: e.g., "pn,lid").
// Por padrão desabilitado (fallback order vazio) para manter sempre LID em grupos,
// a menos que explicitamente configurado via env.
export const GROUP_SEND_RETRY_ON_421 =
  process.env.GROUP_SEND_RETRY_ON_421 == _undefined ? true : process.env.GROUP_SEND_RETRY_ON_421 == 'true'
export const GROUP_SEND_FALLBACK_ORDER = (process.env.GROUP_SEND_FALLBACK_ORDER || '')
// Consider a group as "large" when participant count exceeds this threshold
export const GROUP_LARGE_THRESHOLD = parseInt(process.env.GROUP_LARGE_THRESHOLD || '800')

// Controls for large-group No-sessions fallback (assertSessions)
export const GROUP_ASSERT_CHUNK_SIZE = parseInt(process.env.GROUP_ASSERT_CHUNK_SIZE || '100')
export const GROUP_ASSERT_FLOOD_WINDOW_MS = parseInt(process.env.GROUP_ASSERT_FLOOD_WINDOW_MS || '5000')
export const NO_SESSION_RETRY_BASE_DELAY_MS = parseInt(process.env.NO_SESSION_RETRY_BASE_DELAY_MS || '150')
export const NO_SESSION_RETRY_PER_200_DELAY_MS = parseInt(process.env.NO_SESSION_RETRY_PER_200_DELAY_MS || '300')
export const NO_SESSION_RETRY_MAX_DELAY_MS = parseInt(process.env.NO_SESSION_RETRY_MAX_DELAY_MS || '2000')

// Group receipt/status fan-out controls
// If true, suprime recibos individuais de grupos (message-receipt.update por participante)
export const GROUP_IGNORE_INDIVIDUAL_RECEIPTS =
  process.env.GROUP_IGNORE_INDIVIDUAL_RECEIPTS === _undefined ? true : process.env.GROUP_IGNORE_INDIVIDUAL_RECEIPTS == 'true'
// Se true, em "messages.update" para grupos, só repassa DELIVERY_ACK (delivered)
export const GROUP_ONLY_DELIVERED_STATUS =
  process.env.GROUP_ONLY_DELIVERED_STATUS === _undefined ? true : process.env.GROUP_ONLY_DELIVERED_STATUS == 'true'

// Throttle asserts triggered by message-receipt 'retry' events
export const RECEIPT_RETRY_ASSERT_COOLDOWN_MS = parseInt(process.env.RECEIPT_RETRY_ASSERT_COOLDOWN_MS || '15000')
export const RECEIPT_RETRY_ASSERT_MAX_TARGETS = parseInt(process.env.RECEIPT_RETRY_ASSERT_MAX_TARGETS || '400')

// JID mapping cache (PN <-> LID)
export const JIDMAP_CACHE_ENABLED = process.env.JIDMAP_CACHE_ENABLED === _undefined ? true : process.env.JIDMAP_CACHE_ENABLED == 'true'
// Enable/disable jidmap list endpoint.
export const JIDMAP_LIST_ENABLED = process.env.JIDMAP_LIST_ENABLED === _undefined ? true : process.env.JIDMAP_LIST_ENABLED == 'true'
// Enable/disable lookups against stored jidmap cache (unoapi-jidmap:*).
export const JIDMAP_STORED_LOOKUP_ENABLED =
  process.env.JIDMAP_STORED_LOOKUP_ENABLED === _undefined ? false : process.env.JIDMAP_STORED_LOOKUP_ENABLED == 'true'
export const JIDMAP_TTL_SECONDS = parseInt(process.env.JIDMAP_TTL_SECONDS || '604800') // 7 days

// Self-heal: assert sessions when decrypt stub is detected in inbound messages
export const SELFHEAL_ASSERT_ON_DECRYPT =
  process.env.SELFHEAL_ASSERT_ON_DECRYPT === _undefined ? true : process.env.SELFHEAL_ASSERT_ON_DECRYPT == 'true'

// Periodic session assert (prevent stale e2e causing "Aguardando mensagem")
export const PERIODIC_ASSERT_ENABLED =
  process.env.PERIODIC_ASSERT_ENABLED === _undefined ? false : process.env.PERIODIC_ASSERT_ENABLED == 'true'
export const PERIODIC_ASSERT_INTERVAL_MS = parseInt(process.env.PERIODIC_ASSERT_INTERVAL_MS || '7200000') // 10 min
export const PERIODIC_ASSERT_MAX_TARGETS = parseInt(process.env.PERIODIC_ASSERT_MAX_TARGETS || '75')
export const PERIODIC_ASSERT_RECENT_WINDOW_MS = parseInt(process.env.PERIODIC_ASSERT_RECENT_WINDOW_MS || '3600000') // 60 min
// Se verdadeiro, força criação/renovação de sessões no assert periódico; recomenda-se false
export const PERIODIC_ASSERT_FORCE =
  process.env.PERIODIC_ASSERT_FORCE === _undefined ? false : process.env.PERIODIC_ASSERT_FORCE == 'true'
// Incluir grupos no assert periódico (custo maior). Recomenda-se false
export const PERIODIC_ASSERT_INCLUDE_GROUPS =
  process.env.PERIODIC_ASSERT_INCLUDE_GROUPS === _undefined ? false : process.env.PERIODIC_ASSERT_INCLUDE_GROUPS == 'false'

// Preassert 1:1 (assertSessions antes do envio)
// Permite reduzir a frequência para diminuir latência/CPU em alto volume
export const ONE_TO_ONE_PREASSERT_ENABLED =
  process.env.ONE_TO_ONE_PREASSERT_ENABLED === _undefined ? true : process.env.ONE_TO_ONE_PREASSERT_ENABLED == 'true'
// Cooldown por destinatário (ms). Padrão 120 minutos (7200000 ms)
export const ONE_TO_ONE_PREASSERT_COOLDOWN_MS = parseInt(process.env.ONE_TO_ONE_PREASSERT_COOLDOWN_MS || `${0}`)
// TTL do throttle de preassert 1:1 persistido no Redis (segundos). Padrão 4h.
export const ONE_TO_ONE_PREASSERT_REDIS_TTL_SEC = parseInt(process.env.ONE_TO_ONE_PREASSERT_REDIS_TTL_SEC || `${0}`)
// Habilita logs/sonda de contagem de chaves após preassert (custo extra de Redis)
export const ONE_TO_ONE_ASSERT_PROBE_ENABLED =
  process.env.ONE_TO_ONE_ASSERT_PROBE_ENABLED === _undefined ? false : process.env.ONE_TO_ONE_ASSERT_PROBE_ENABLED == 'false'
export const ONE_TO_ONE_PREASSERT_PURGE_DEVICE_LIST: boolean =
  process.env.ONE_TO_ONE_PREASSERT_PURGE_DEVICE_LIST === _undefined ? false : process.env.ONE_TO_ONE_PREASSERT_PURGE_DEVICE_LIST == 'true'
// Enable Redis Signal session purge before retrying send (watchdog). Default false for performance.
export const SIGNAL_SESSION_PURGE_ENABLED: boolean =
  process.env.SIGNAL_SESSION_PURGE_ENABLED === _undefined ? false : process.env.SIGNAL_SESSION_PURGE_ENABLED == 'true'
export const SIGNAL_CACHE_SAFE_MODE: boolean =
  process.env.SIGNAL_CACHE_SAFE_MODE === _undefined ? false : process.env.SIGNAL_CACHE_SAFE_MODE == 'true'

// Anti-spam / rate limits (per session)
// Max messages per minute por sessão (0 = desabilitado)
export const RATE_LIMIT_GLOBAL_PER_MINUTE = parseInt(process.env.RATE_LIMIT_GLOBAL_PER_MINUTE || '0')
// Max mensagens por minuto por destinatário (0 = desabilitado)
export const RATE_LIMIT_PER_TO_PER_MINUTE = parseInt(process.env.RATE_LIMIT_PER_TO_PER_MINUTE || '0')
// Tempo de bloqueio ao exceder (em segundos). Se 0, apenas retorna erro sem bloquear.
export const RATE_LIMIT_BLOCK_SECONDS = parseInt(process.env.RATE_LIMIT_BLOCK_SECONDS || '60')

// Deduplication window for inbound messages (ms)
// If the same WA message id arrives again within this window, it will be skipped.
export const INBOUND_DEDUP_WINDOW_MS = parseInt(process.env.INBOUND_DEDUP_WINDOW_MS || '7000')

// Outgoing idempotency guard
// If enabled, the incoming job will skip sending a message when it finds
// evidence that the UNO id has already been processed (key/status present in store).
export const OUTGOING_IDEMPOTENCY_ENABLED: boolean =
  process.env.OUTGOING_IDEMPOTENCY_ENABLED === _undefined ? true : process.env.OUTGOING_IDEMPOTENCY_ENABLED == 'true'

// Webhook ID normalization preference
// If true, converts LID JIDs to PN when possible before sending to webhooks.
// Default is false to preserve @lid in payloads (evita "ID nu").
export const WEBHOOK_PREFER_PN_OVER_LID: boolean =
  process.env.WEBHOOK_PREFER_PN_OVER_LID === _undefined ? true : process.env.WEBHOOK_PREFER_PN_OVER_LID == 'true'

// Delivery watchdog: tenta recuperar mensagens presas em "sent" sem delivered
export const DELIVERY_WATCHDOG_ENABLED = process.env.DELIVERY_WATCHDOG_ENABLED === _undefined ? false : process.env.DELIVERY_WATCHDOG_ENABLED == 'true'
export const DELIVERY_WATCHDOG_MS = parseInt(process.env.DELIVERY_WATCHDOG_MS || '120000')
// Default to 2 attempts so we can try an alternate BR candidate (12<->13) once
export const DELIVERY_WATCHDOG_MAX_ATTEMPTS = parseInt(process.env.DELIVERY_WATCHDOG_MAX_ATTEMPTS || '2')
export const DELIVERY_WATCHDOG_GROUPS = process.env.DELIVERY_WATCHDOG_GROUPS === _undefined ? false : process.env.DELIVERY_WATCHDOG_GROUPS == 'true'

// BR send-order: if enabled, tries 12-digit then 13-digit candidate on send
export const BR_SEND_ORDER_ENABLED =
  process.env.BR_SEND_ORDER_ENABLED === _undefined ? false : process.env.BR_SEND_ORDER_ENABLED == 'true'


// Endereçamento para conversas 1:1 (envio)
// 'pn' (padrão): quando possível, envia usando PN; 'lid': força envio usando lid.
export const ONE_TO_ONE_ADDRESSING_MODE: 'lid' | 'pn' = (() => {
  // Default to 'lid' as documented; allow override via env
  const v = (process.env.ONE_TO_ONE_ADDRESSING_MODE || 'pn').toString().toLowerCase()
  return (v === 'lid' ? 'lid' : 'pn')
})()

// Background resolver: try to map LIDs seen to PN asynchronously (accelerates JIDMAP population)
export const LID_RESOLVER_ENABLED: boolean =
  process.env.LID_RESOLVER_ENABLED === _undefined ? true : process.env.LID_RESOLVER_ENABLED == 'true'
export const LID_RESOLVER_BACKOFF_MS: number[] = (() => {
  try {
    const raw = (process.env.LID_RESOLVER_BACKOFF_MS || '30000,120000,300000').toString()
    return raw.split(',').map((s) => parseInt(s.trim())).filter((n) => Number.isFinite(n) && n > 0)
  } catch { return [15000, 60000, 300000] }
})()
export const LID_RESOLVER_SWEEP_INTERVAL_MS = parseInt(process.env.LID_RESOLVER_SWEEP_INTERVAL_MS || '600000')
export const LID_RESOLVER_MAX_PENDING = parseInt(process.env.LID_RESOLVER_MAX_PENDING || '2000')

// Enriquecimento do JIDMAP (PN<->LID) a partir do contact-info
export const JIDMAP_ENRICH_ENABLED = process.env.JIDMAP_ENRICH_ENABLED === _undefined ? false : process.env.JIDMAP_ENRICH_ENABLED == 'true'
export const JIDMAP_ENRICH_PER_SWEEP = parseInt(process.env.JIDMAP_ENRICH_PER_SWEEP || '20')
// Espelhar periodicamente o cache interno (unoapi-auth:*:lid-mapping-*) no JIDMAP
export const JIDMAP_ENRICH_AUTH_ENABLED = process.env.JIDMAP_ENRICH_AUTH_ENABLED === _undefined ? true : process.env.JIDMAP_ENRICH_AUTH_ENABLED == 'true'

// Watchdog purge scan batch size (Redis SCAN COUNT per pattern)
export const WATCHDOG_PURGE_SCAN_COUNT = parseInt(process.env.WATCHDOG_PURGE_SCAN_COUNT || '20')
// Pace background Redis-heavy tasks (ms). Helps avoid CPU spikes under bursts.
export const WATCHDOG_TASK_MIN_INTERVAL_MS = parseInt(process.env.WATCHDOG_TASK_MIN_INTERVAL_MS || '30000')
export const JIDMAP_ENRICH_MIN_INTERVAL_MS = parseInt(process.env.JIDMAP_ENRICH_MIN_INTERVAL_MS || '30000')

// Server-ACK retry (assert+resend with same id)
// Comma-separated delays in ms (e.g., "8000,30000,60000")
export const ACK_RETRY_DELAYS_MS: number[] = (() => {
  try {
    const raw = process.env.ACK_RETRY_DELAYS_MS || '8000,30000,60000'
    return raw.split(',').map((s) => parseInt(s.trim())).filter((n) => Number.isFinite(n) && n > 0)
  } catch { return [8000, 30000, 60000] }
})()
// Optional hard cap for attempts; if set lower than delays length, it limits retries
export const ACK_RETRY_MAX_ATTEMPTS: number = parseInt(process.env.ACK_RETRY_MAX_ATTEMPTS || '0') || 0
// Enable/disable ACK-retry scheduling entirely (default true)
export const ACK_RETRY_ENABLED: boolean = process.env.ACK_RETRY_ENABLED === _undefined ? false : process.env.ACK_RETRY_ENABLED == 'false'

// Media send retry (ex.: presigned URL 403 enquanto objeto não ficou disponível)
export const MEDIA_RETRY_ENABLED: boolean =
  process.env.MEDIA_RETRY_ENABLED === _undefined ? true : process.env.MEDIA_RETRY_ENABLED == 'true'
export const MEDIA_RETRY_DELAYS_MS: number[] = (() => {
  try {
    const raw = process.env.MEDIA_RETRY_DELAYS_MS || '1200,3000,7000'
    return raw.split(',').map((s) => parseInt(s.trim())).filter((n) => Number.isFinite(n) && n > 0)
  } catch { return [1200, 3000, 7000] }
})()

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
    maxAttempts: parseInt(storage?.maxAttempts || STORAGE_MAX_ATTEMPTS as any),
  }
  if (forcePathStyle) {
    options.forcePathStyle = forcePathStyle
  }
  return options
}
