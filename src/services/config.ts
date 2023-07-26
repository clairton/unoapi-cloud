import { getStore, Store } from './store'
import { getStoreFile } from './store_file'
import { GroupMetadata, WAMessage, WAMessageKey } from '@whiskeysockets/baileys'
import { isIndividualJid } from './transformer'
import logger from './logger'
import { Level } from 'pino'

export interface GetGroupMetadata {
  (message: WAMessage, store: Store): Promise<GroupMetadata | undefined>
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export const ignoreGetGroupMetadata: GetGroupMetadata = async (_message: WAMessage, _store: Store) => undefined

export const getGroupMetadata: GetGroupMetadata = async (message: WAMessage, store: Store) => {
  logger.debug(`Retrieving group metadata...`)
  const { key } = message
  if (key.remoteJid && !isIndividualJid(key.remoteJid)) {
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
      logger.debug('Return group metadata %s!', groupMetadata)
    }
    return groupMetadata
  }
  return undefined
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
  autoRestart: boolean
  rejectCalls: string
  throwWebhookError: false
  rejectCallsWebhook: string
  shouldIgnoreJid: (jid: string) => boolean | undefined
  shouldIgnoreKey: (key: WAMessageKey, messageType: string | undefined) => boolean | undefined
  getStore: getStore
  baseStore: string
  webhooks: Webhook[]
  logLevel: Level | undefined
  getGroupMetadata: GetGroupMetadata
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
  rejectCallsWebhook: '',
  logLevel: undefined,
  autoRestart: false,
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
  getGroupMetadata: ignoreGetGroupMetadata,
  ignoreDataStore: false,
}

export interface getConfig {
  (phone: string): Promise<Config>
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export const getConfigDefault: getConfig = async (_phone: string): Promise<Config> => {
  return defaultConfig
}
