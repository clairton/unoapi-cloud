import * as dotenv from 'dotenv'
dotenv.config()

import { BindBrokerJob } from './jobs/bind_broker'
import { 
  UNOAPI_JOB_BIND, 
  UNOAPI_JOB_BIND_BROKER,
} from './defaults'
import { amqpConsume } from './amqp'
import { startRedis } from './services/redis'
import { getConfig } from './services/config'
import { getConfigRedis } from './services/config_redis'
import logger from './services/logger'
import { version } from '../package.json'

const getConfig: getConfig = getConfigRedis
const bindJob = new BindBrokerJob()

const startBroker = async () => {
  await startRedis()

  logger.info('Unoapi Cloud version %s starting broker...', version)

  logger.info('Starting bind broker consumer')
  await amqpConsume(UNOAPI_JOB_BIND, UNOAPI_JOB_BIND_BROKER, bindJob.consume.bind(bindJob))

  logger.info('Unoapi Cloud version %s started broker!', version)
}
startBroker()

process.on('unhandledRejection', (reason: any, promise) => {
  logger.error('unhandledRejection broker: %s %s %s', reason, reason.stack, promise)
  throw reason
})
