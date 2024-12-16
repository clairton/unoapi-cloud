import { UNOAPI_SERVER_NAME } from '../defaults'
import { getStore } from './store'
import { getStoreFile } from './store_file'
import { WAMessageKey } from 'baileys'
import { Level } from 'pino'

export const configs: Map<string, Config> = new Map()

export type connectionType = 'qrcode' | 'pairing_code'

export interface GetMessageMetadata {
  <T>(message: T): Promise<T>
}

export const getMessageMetadataDefault: GetMessageMetadata = async <T>(data: T) => data

export type Webhook = {
  id: string,
  url: string
  urlAbsolute: string
  token: string
  header: string
  timeoutMs: number
  sendNewMessages: boolean
  sendGroupMessages: boolean
  sendOutgoingMessages: boolean
}

export type Config = {
  ignoreGroupMessages: boolean
  ignoreBroadcastMessages: boolean
  ignoreBroadcastStatuses: boolean
  ignoreHistoryMessages: boolean
  ignoreYourselfMessages: boolean
  ignoreOwnMessages: boolean
  sendConnectionStatus: boolean
  notifyFailedMessages: boolean
  composingMessage: boolean
  autoRestartMs: number
  autoConnect: boolean
  retryRequestDelayMs: number
  rejectCalls: string
  throwWebhookError: boolean
  rejectCallsWebhook: string
  messageCallsWebhook: string
  proxyUrl: string | undefined
  sessionWebhook: string
  shouldIgnoreJid: (jid: string) => boolean | undefined
  shouldIgnoreKey: (key: WAMessageKey, messageType: string | undefined) => boolean | undefined
  getStore: getStore
  baseStore: string
  webhooks: Webhook[]
  logLevel: Level
  getMessageMetadata: GetMessageMetadata
  ignoreDataStore: boolean
  sendReactionAsReply: boolean
  sendProfilePicture: boolean
  authToken: string | undefined
  authHeader: string | undefined,
  provider: 'baileys',
  server:  string | undefined,
  connectionType: connectionType,
  wavoipToken:  string | undefined,
  useRedis: boolean,
  useS3: boolean,
}

export const defaultConfig: Config = {
  ignoreGroupMessages: true,
  ignoreBroadcastStatuses: true,
  ignoreBroadcastMessages: false,
  ignoreHistoryMessages: true,
  ignoreOwnMessages: true,
  ignoreYourselfMessages: true,
  sendConnectionStatus: true,
  notifyFailedMessages: true,
  composingMessage: false,
  rejectCalls: '',
  sessionWebhook: '',
  rejectCallsWebhook: '',
  messageCallsWebhook: '',
  logLevel: 'fatal',
  autoConnect: true,
  autoRestartMs: 0,
  retryRequestDelayMs: 1_000,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  shouldIgnoreJid: (_jid: string) => false,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  shouldIgnoreKey: (_key: WAMessageKey, _messageType: string | undefined) => false,
  getStore: getStoreFile,
  throwWebhookError: false,
  baseStore: './data',
  webhooks: [
    {
      id: 'default',
      url: '',
      urlAbsolute: '',
      token: '',
      header: '',
      timeoutMs: 5_000,
      sendNewMessages: false,
      sendGroupMessages: true,
      sendOutgoingMessages: true,
    },
  ],
  getMessageMetadata: getMessageMetadataDefault,
  ignoreDataStore: false,
  sendReactionAsReply: false,
  sendProfilePicture: false,
  proxyUrl: undefined,
  authToken: undefined,
  authHeader: undefined,
  provider: 'baileys',
  server: UNOAPI_SERVER_NAME,
  connectionType: 'qrcode',
  wavoipToken: '',
  useRedis: false,
  useS3: false,
}

export interface getConfig {
  (phone: string): Promise<Config>
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export const getConfigDefault: getConfig = async (_phone: string): Promise<Config> => {
  return defaultConfig
}
