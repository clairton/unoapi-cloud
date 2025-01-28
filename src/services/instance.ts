import { Client } from './client';
import { Config, getConfig } from './config';
import { getConfigByEnv } from './config_by_env';
import { getConfigRedis } from './config_redis';
import { Incoming } from './incoming'
import { Listener } from './listener';
import logger from './logger';
import { Outgoing } from './outgoing'

export const intances: Map<string, Intance> = new Map()

interface Env<T> {
  [Key: string]: T;
}

export const getIntance  = async <T>(phone: string, env: Env<T>): Promise<Intance> => {
  if (!intances.has(phone)) {
    logger.info('Creating instance %s', phone)
    const getConfigVar: getConfig = env.REDIS_URL ? getConfigRedis : getConfigByEnv

  } else {
    logger.debug('Retrieving intances %s', phone)
  }
  return intances.get(phone)!
}

export class Intance {
  private env: Env<string>
  private incoming: Incoming
  private outgoing: Outgoing
  private listener: Listener
  private client: Client
  private config: Config
}