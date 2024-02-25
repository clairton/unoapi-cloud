import { WAMessageKey, isJidStatusBroadcast, isJidGroup, isJidBroadcast } from '@whiskeysockets/baileys'
import { Config, defaultConfig } from './config'
import { jidToPhoneNumber } from './transformer'
import logger from './logger'

interface IgnoreJid {
  (jid: string): boolean | undefined
}

interface IgnoreKey {
  (key: WAMessageKey, messageType: string | undefined): boolean | undefined
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const notIgnoreJid = (_jid: string) => {
  logger.info('Config to not ignore any jid')
  return false
}
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const notIgnoreKey: IgnoreKey = (_key: WAMessageKey, _messageType: string | undefined) => {
  logger.info('Config to not ignore any key')
  return false
}

const IgnoreOwnKey: IgnoreKey = (key: WAMessageKey, messageType: string | undefined) => {
  if (!messageType) {
    return true
  } else if (['update', 'receipt'].includes(messageType)) {
    // update need process always
    return false
  } else {
    const filter = key && !!key.fromMe
    logger.debug('IgnoreOwnKey: %s => %s', JSON.stringify(key), filter)
    return filter
  }
}

export class MessageFilter {
  private ignoreJid: IgnoreJid
  private ignoreKey: IgnoreKey

  constructor(phone: string, config: Config = defaultConfig) {
    const ignoresJid: IgnoreJid[] = []
    const ignoresKey: IgnoreKey[] = []

    if (config.ignoreGroupMessages) {
      logger.info('Config to ignore jid group messages')
      ignoresJid.push((jid) => {
        const is = isJidGroup(jid)
        logger.trace(`${jid} is group ${is}`)
        return is
      })
    }
    if (config.ignoreBroadcastStatuses) {
      logger.info('Config to ignore jid broadcast statuses')
      ignoresJid.push((jid) => {
        const is = isJidStatusBroadcast(jid)
        logger.trace(`${jid} is status broadcast ${is}`)
        return is
      })
    }
    if (config.ignoreBroadcastMessages) {
      logger.info('Config to ignore jid broadcast messages')
      ignoresJid.push((jid) => {
        const is = isJidBroadcast(jid)
        logger.trace(`${jid} is message broadcast ${is}`)
        return is
      })
    }
    if (config.ignoreOwnMessages) {
      logger.info('Config to ignore key own messages')
      ignoresKey.push(IgnoreOwnKey)
    }
    if (config.ignoreYourselfMessages) {
      logger.info('Config to ignore key yourself messages')
      const IgnoreYourselfKey: IgnoreKey = (key: WAMessageKey, messageType: string | undefined) => {
        if (!messageType) {
          return true
        } else if (['update', 'receipt'].includes(messageType)) {
          // update need process always
          return false
        } else {
          const senderPhone = jidToPhoneNumber(key.remoteJid, '')
          const filter = phone == senderPhone
          logger.trace('IgnoreYourselfKey: %s === %s => %s', phone, senderPhone, filter)
          return filter
        }
      }
      ignoresKey.push(IgnoreYourselfKey)
    }

    const ignoreJid = (jid: string) => {
      const fn = (acc: number, f: IgnoreJid): number => {
        return f(jid) ? ++acc : acc
      }
      const sum: number = ignoresJid.reduce(fn, 0)
      logger.trace(`${jid} ignore by jid sum is ${sum}`)
      return sum > 0
    }
    logger.info('%s Configs to ignore by jid', phone, ignoresJid.length)
    logger.info('%s Configs to ignore by key', phone, ignoresKey.length)
    this.ignoreJid = ignoresJid.length > 0 ? ignoreJid : notIgnoreJid
    const ignoreKey: IgnoreKey = (key: WAMessageKey, messageType: string | undefined) => {
      const sum = ignoresKey.reduce((acc, f) => (f(key, messageType) ? ++acc : acc), 0)
      logger.debug(`key: ${JSON.stringify(key)} type: ${messageType} ignore sum is ${sum}`)
      return sum > 0
    }
    this.ignoreKey = ignoresKey.length > 0 ? ignoreKey : notIgnoreKey
  }

  isIgnoreJid(jid: string) {
    return this.ignoreJid(jid)
  }

  isIgnoreKey(key: WAMessageKey, messageType: string | undefined) {
    return this.ignoreKey(key, messageType)
  }
}
