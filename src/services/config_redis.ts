import { getConfig, Config, ignoreGetMessageMetadata, getMessageMetadata } from './config'
import { getConfig as getConfigCache } from './redis'
import { getStoreRedis } from './store_redis'
import logger from './logger'
import { getConfigByEnv } from './config_by_env'
import { MessageFilter } from './message_filter'

export const configs: Map<string, Config> = new Map()

export const getConfigRedis: getConfig = async (phone: string): Promise<Config> => {
  if (!configs.has(phone)) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const configRedis: any = await getConfigCache(phone)
    logger.info('Retrieve config default for %s', phone)
    const config: Config = await getConfigByEnv(phone)
    if (configRedis) {
      const keys = Object.keys(configRedis)
      for (let index = 0; index < keys.length; index++) {
        const key = keys[index]
        if (key in configRedis) {
          config[key] = configRedis[key]
        }
      }
    }
    const filter: MessageFilter = new MessageFilter(phone, config)
    config.shouldIgnoreJid = filter.isIgnoreJid.bind(filter)
    config.shouldIgnoreKey = filter.isIgnoreKey.bind(filter)
    config.getMessageMetadata = config.ignoreGroupMessages ? ignoreGetMessageMetadata : getMessageMetadata
    config.getStore = getStoreRedis
    logger.info('Config redis: %s -> %s', phone, JSON.stringify(config))
    configs.set(phone, config)
  }
  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
  return configs.get(phone)!
}
