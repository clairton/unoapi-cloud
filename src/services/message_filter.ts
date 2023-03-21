import { WAMessageKey, isJidStatusBroadcast, isJidGroup, isJidBroadcast } from '@adiwajshing/baileys'
import { ClientConfig, defaultClientConfig } from './client'

interface IgnoreJid {
  (jid: string): boolean
}

interface IgnoreKey {
  ({ key, messageType = '' }: { key: WAMessageKey; messageType: string | undefined }): boolean
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const notIgnoreJid = (_jid: string) => {
  console.info('Config to not ignore any jid')
  return false
}
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const notIgnoreKey = ({ key: _key }: { key: WAMessageKey }) => {
  console.info('Config to not ignore any key')
  return false
}

const IgnoreOwnKey: IgnoreKey = ({ key, messageType = '' }: { key: WAMessageKey; messageType: string | undefined }) => {
  if (['update', 'receipt'].includes(messageType)) {
    // update need process always
    return false
  } else {
    const filter = key && !!key.fromMe
    console.debug('IgnoreOwnKey: %s => %s', key, filter)
    return filter
  }
}

export class MessageFilter {
  private ignoreJid: IgnoreJid
  private ignoreKey: IgnoreKey

  constructor(config: ClientConfig = defaultClientConfig) {
    const ignoresJid: IgnoreJid[] = []
    const ignoresKey: IgnoreKey[] = []

    if (config.ignoreGroupMessages) {
      console.info('Config to ignore group messages')
      ignoresJid.push(isJidGroup as IgnoreJid)
    }
    if (config.ignoreBroadcastStatuses) {
      console.info('Config to ignore broadcast statuses')
      ignoresJid.push(isJidStatusBroadcast as IgnoreJid)
    }
    if (config.ignoreBroadcastMessages) {
      console.info('Config to ignore broadcast messages')
      ignoresJid.push(isJidBroadcast as IgnoreJid)
    }
    if (config.ignoreOwnMessages) {
      console.info('Config to ignore own messages')
      ignoresKey.push(IgnoreOwnKey)
    }

    const ignoreJid = (jid: string) => ignoresJid.reduce((acc, f) => (f(jid) ? ++acc : acc), 0) > 0
    console.info('%s Configs to ignore by jid', ignoresJid.length)
    console.info('%s Configs to ignore by key', ignoresKey.length)
    this.ignoreJid = ignoresJid.length > 0 ? ignoreJid : notIgnoreJid
    const ignoreKey = ({ key, messageType = '' }: { key: WAMessageKey; messageType: string | undefined }) => {
      return ignoresKey.reduce((acc, f) => (f({ key, messageType }) ? ++acc : acc), 0) > 0
    }
    this.ignoreKey = ignoresKey.length > 0 ? ignoreKey : notIgnoreKey
  }

  isIgnore({ key, messageType = '' }: { key: WAMessageKey; messageType: string | undefined }) {
    return !key || !key.remoteJid || this.ignoreJid(key.remoteJid) || this.ignoreKey({ key, messageType })
  }
}
