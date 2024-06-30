import * as dotenv from 'dotenv'
dotenv.config()

import { BindWorkerJob } from './jobs/bind_worker'
import { 
  UNOAPI_JOB_BIND, 
  UNOAPI_JOB_BLACKLIST_ADD,
} from './defaults'
import { amqpConsume } from './amqp'
import { startRedis } from './services/redis'
import { getConfig } from './services/config'
import { getConfigRedis } from './services/config_redis'
import logger from './services/logger'
import { version } from '../package.json'
import { addToBlacklist } from './jobs/add_to_blacklist'

const getConfig: getConfig = getConfigRedis
const bindJob = new BindWorkerJob()

const startWorker = async () => {
  await startRedis()

  logger.info('Unoapi Cloud version %s starting worker...', version)

  logger.info('Starting bind worker consumer')
  await amqpConsume(UNOAPI_JOB_BIND, 'worker', bindJob.consume.bind(bindJob))

  logger.info('Starting blacklist add consumer')
  await amqpConsume(UNOAPI_JOB_BLACKLIST_ADD, '', addToBlacklist)

  logger.info('Unoapi Cloud version %s started worker!', version)
}
startWorker()

// eslint-disable-next-line @typescript-eslint/no-unused-vars
import './bridge'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
process.on('unhandledRejection', (reason: any, promise) => {
  logger.error('unhandledRejection: %s %s %s', reason, reason.stack, promise)
  throw reason
})
