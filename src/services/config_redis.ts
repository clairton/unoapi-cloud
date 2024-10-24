import { getConfig, Config, configs } from './config'
import { getConfig as getConfigCache } from './redis'
import { getStoreRedis } from './store_redis'
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
        if (key === 'webhooks') {
          const webhooksConfig = configRedis[key][0];
          Object.keys(webhooksConfig).forEach((keyWebhook) => {
            logger.debug('Override webhook env config by redis webhook config in %s: %s => %s', phone, keyWebhook, JSON.stringify(webhooksConfig[keyWebhook]));
            config[keyWebhook] = webhooksConfig[keyWebhook];
          });
        } else {
          logger.debug('Override env config by redis config in %s: %s => %s', phone, key, JSON.stringify(configRedis[key]));
          config[key] = configRedis[key];
        }
      });
    }
    
    const filter: MessageFilter = new MessageFilter(phone, config)
    config.shouldIgnoreJid = filter.isIgnoreJid.bind(filter)
    config.shouldIgnoreKey = filter.isIgnoreKey.bind(filter)
    config.getStore = getStoreRedis
    logger.info('Config redis: %s -> %s', phone, JSON.stringify(config))
    configs.set(phone, config)
  }
  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
  return configs.get(phone)!
}
