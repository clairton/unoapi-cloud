import { WAMessageKey, isJidStatusBroadcast, isJidGroup, isJidBroadcast } from '@adiwajshing/baileys'
import { Config, defaultConfig } from './config'

interface IgnoreJid {
  (jid: string): boolean
}

interface IgnoreKey {
  (key: WAMessageKey, messageType: string): boolean
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const notIgnoreJid = (_jid: string) => {
  console.info('Config to not ignore any jid')
  return false
}
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const notIgnoreKey = (key: WAMessageKey, messageType: string) => {
  console.info('Config to not ignore any key')
  return false
}

const IgnoreOwnKey: IgnoreKey = (key: WAMessageKey, messageType: string) => {
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

  constructor(config: Config = defaultConfig) {
    const ignoresJid: IgnoreJid[] = []
    const ignoresKey: IgnoreKey[] = []

    if (config.ignoreGroupMessages) {
      console.info('Config to ignore jid group messages')
      ignoresJid.push((jid) => {
        const is = isJidGroup(jid)
        console.debug(`${jid} is group ${is}`)
        return is
      })
    }
    if (config.ignoreBroadcastStatuses) {
      console.info('Config to ignore jid broadcast statuses')
      ignoresJid.push((jid) => {
        const is = isJidStatusBroadcast(jid)
        console.debug(`${jid} is status broadcast ${is}`)
        return is
      })
    }
    if (config.ignoreBroadcastMessages) {
      console.info('Config to ignore jid broadcast messages')
      ignoresJid.push((jid) => {
        const is = isJidBroadcast(jid)
        console.debug(`${jid} is message broadcast ${is}`)
        return is
      })
    }
    if (config.ignoreOwnMessages) {
      console.info('Config to ignore key own messages')
      ignoresKey.push(IgnoreOwnKey)
    }

    const ignoreJid = (jid: string) => {
      const fn = (acc, f) => {
        return f(jid) ? ++acc : acc
      }
      const sum = ignoresJid.reduce(fn, 0)
      console.debug(`${jid} ignore sum is ${sum}`)
      return sum > 0
    }
    console.info('%s Configs to ignore by jid', ignoresJid.length)
    console.info('%s Configs to ignore by key', ignoresKey.length)
    this.ignoreJid = ignoresJid.length > 0 ? ignoreJid : notIgnoreJid
    const ignoreKey = (key: WAMessageKey, messageType: string) => {
      return ignoresKey.reduce((acc, f) => (f(key, messageType) ? ++acc : acc), 0) > 0
    }
    this.ignoreKey = ignoresKey.length > 0 ? ignoreKey : notIgnoreKey
  }

  isIgnoreJid(jid) {
    return this.ignoreJid(jid)
  }

  isIgnoreKey(key: WAMessageKey, messageType: string | undefined) {
    return this.ignoreKey(key, messageType)
  }
}
