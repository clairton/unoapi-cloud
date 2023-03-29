import { getStore, Store } from './store'
import { getStoreFile } from './store_file'
import { GroupMetadata, WAMessage, WAMessageKey } from '@adiwajshing/baileys'
import { isIndividualJid } from './transformer'

export interface GetGroupMetadata {
  (message: WAMessage, store: Store): Promise<GroupMetadata | undefined>
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export const ignoreGetGroupMetadata: GetGroupMetadata = async (_message: WAMessage, _store: Store) => undefined

export const getGroupMetadata: GetGroupMetadata = async (message: WAMessage, store: Store) => {
  console.debug(`Retrieving group metadata...`)
  const { key } = message
  if (key.remoteJid && !isIndividualJid(key.remoteJid)) {
    return store?.dataStore.fetchGroupMetadata(key.remoteJid, undefined)
  }
  return undefined
}

export type Config = {
  ignoreGroupMessages: boolean
  ignoreBroadcastMessages: boolean
  ignoreBroadcastStatuses: boolean
  ignoreHistoryMessages: boolean
  ignoreOwnMessages: boolean
  sendConnectionStatus: boolean
  autoRestart: boolean
  rejectCalls: string
  rejectCallsWebhook: string
  shouldIgnoreJid: (jid: string) => boolean | undefined
  shouldIgnoreKey: (key: WAMessageKey, messageType: string) => boolean | undefined
  getStore: getStore
  webhookUrl: string
  webhookToken: string
  webhookHeader: string
  getGroupMetadata: GetGroupMetadata
}

export const defaultConfig: Config = {
  ignoreGroupMessages: true,
  ignoreBroadcastStatuses: true,
  ignoreBroadcastMessages: false,
  ignoreHistoryMessages: true,
  ignoreOwnMessages: true,
  sendConnectionStatus: true,
  rejectCalls: '',
  rejectCallsWebhook: '',
  autoRestart: false,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  shouldIgnoreJid: (_jid: string) => false,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  shouldIgnoreKey: (_key: WAMessageKey, _messageType: string) => false,
  getStore: getStoreFile,
  webhookUrl: '',
  webhookToken: '',
  webhookHeader: 'Authorization',
  getGroupMetadata: ignoreGetGroupMetadata,
}

export interface getConfig {
  (phone: string): Promise<Config>
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export const getConfigDefault: getConfig = async (_phone: string): Promise<Config> => {
  return defaultConfig
}
