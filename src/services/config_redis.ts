import { getConfig, Config, configs } from './config'
import { getConfig as getConfigCache } from './redis'
import { getStoreRedis } from './store_redis'
import { getStoreFile } from './store_file'
import logger from './logger'
import { getConfigByEnv } from './config_by_env'
import { MessageFilter } from './message_filter'

export const getConfigRedis: getConfig = async (phone: string): Promise<Config> => {
  if (!configs.has(phone)) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const configRedis: any = { ...((await getConfigCache(phone)) || {}) }
    logger.info('Retrieve config default for %s', phone)
    const config: Config = { ...(await getConfigByEnv(phone)) }

    if (configRedis) {
      Object.keys(configRedis).forEach((key) => {
        if (key in configRedis) {
          if (key === 'webhooks') {
            const webhooks: any[] = []
            configRedis[key].forEach((webhook) => {
              Object.keys(config.webhooks[0]).forEach((keyWebhook) => {
                if (!(keyWebhook in webhook)) {
                  // override by env, if not present in redis
                  webhook[keyWebhook] = config.webhooks[0][keyWebhook]
                }
              });
              webhooks.push(webhook)
            });
            configRedis[key] = webhooks
          }
          logger.debug('Override env config by redis config in %s: %s => %s', phone, key, JSON.stringify(configRedis[key]));
          config[key] = configRedis[key];
        }
      });
    }

    config.server = config.server || 'server_1'
    config.provider = config.provider || 'baileys'
    
    const filter: MessageFilter = new MessageFilter(phone, config)
    config.shouldIgnoreJid = filter.isIgnoreJid.bind(filter)
    config.shouldIgnoreKey = filter.isIgnoreKey.bind(filter)
    if (config.useRedis) {
      config.getStore = getStoreRedis
    } else {
      config.getStore = getStoreFile
    }
    logger.info('Config redis: %s -> %s', phone, JSON.stringify(config))
    configs.set(phone, config)
  }
  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
  return configs.get(phone)!
}
