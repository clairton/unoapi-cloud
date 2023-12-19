import { getStore, Store } from './store'
import { getStoreFile } from './store_file'
import { GroupMetadata, WAMessageKey } from '@whiskeysockets/baileys'
import { isIndividualJid } from './transformer'
import logger from './logger'
import { Level } from 'pino'

export interface GetMessageMetadata {
  <T>(data: T, store: Store): Promise<T>
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export const ignoreGetMessageMetadata: GetMessageMetadata = async <T>(data: T, _store: Store) => data

export const getMessageMetadata: GetMessageMetadata = async <T>(message: T, store: Store) => {
  logger.debug(`Retrieving group metadata...`)
  const key = message && message['key']
  if (key.remoteJid && !isIndividualJid(key.remoteJid)) {
    const groupMetadata: GroupMetadata = await store?.dataStore.fetchGroupMetadata(key.remoteJid, undefined)
    if (groupMetadata) {
      logger.debug('Retrieved group metadata %s!', groupMetadata)
    } else {
      let groupMetadata: GroupMetadata = await store?.dataStore.fetchGroupMetadata(key.remoteJid, undefined)
      if (groupMetadata) {
        logger.debug('Retrieved group metadata %s!', groupMetadata)
      } else {
        groupMetadata = {
          id: key.remoteJid,
          owner: '',
          subject: key.remoteJid,
          participants: [],
        }
      }
      message['groupMetadata'] = groupMetadata
    }
  }
  return message
}

export type Webhook = {
  url: string
  token: string
  header: string
}

export type Config = {
  ignoreGroupMessages: boolean
  ignoreBroadcastMessages: boolean
  ignoreBroadcastStatuses: boolean
  ignoreHistoryMessages: boolean
  ignoreYourselfMessages: boolean
  ignoreOwnMessages: boolean
  sendConnectionStatus: boolean
  composingMessage: boolean
  autoRestartMs: number
  autoConnect: boolean
  retryRequestDelayMs: number
  rejectCalls: string
  throwWebhookError: boolean
  rejectCallsWebhook: string
  sessionWebhook: string
  shouldIgnoreJid: (jid: string) => boolean | undefined
  shouldIgnoreKey: (key: WAMessageKey, messageType: string | undefined) => boolean | undefined
  getStore: getStore
  baseStore: string
  webhooks: Webhook[]
  logLevel: Level | undefined
  getMessageMetadata: GetMessageMetadata
  ignoreDataStore: boolean
}

export const defaultConfig: Config = {
  ignoreGroupMessages: true,
  ignoreBroadcastStatuses: true,
  ignoreBroadcastMessages: false,
  ignoreHistoryMessages: true,
  ignoreOwnMessages: true,
  ignoreYourselfMessages: true,
  sendConnectionStatus: true,
  composingMessage: false,
  rejectCalls: '',
  sessionWebhook: '',
  rejectCallsWebhook: '',
  logLevel: undefined,
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
      url: '',
      token: '',
      header: '',
    },
  ],
  getMessageMetadata: ignoreGetMessageMetadata,
  ignoreDataStore: false,
}

export interface getConfig {
  (phone: string): Promise<Config>
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export const getConfigDefault: getConfig = async (_phone: string): Promise<Config> => {
  return defaultConfig
}
