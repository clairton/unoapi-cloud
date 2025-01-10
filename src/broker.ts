import * as dotenv from 'dotenv'
dotenv.config()

import { BindBrokerJob } from './jobs/bind_broker'
import { 
  UNOAPI_JOB_BIND,
  UNOAPI_JOB_BIND_BROKER,
  UNOAPI_JOB_RELOAD,
} from './defaults'
import { amqpConsume } from './amqp'
import { startRedis } from './services/redis'
import { getConfig } from './services/config'
import { getConfigRedis } from './services/config_redis'
import logger from './services/logger'
import { version } from '../package.json'
import { ReloadJob } from './jobs/reload'
import { Reload } from './services/reload'

const reload = new Reload()
const reloadJob = new ReloadJob(reload)
const getConfig: getConfig = getConfigRedis
const bindJob = new BindBrokerJob()

const startBroker = async () => {
  await startRedis()

  logger.info('Unoapi Cloud version %s starting broker...', version)

  logger.info('Starting bind broker consumer')
  await amqpConsume(UNOAPI_JOB_BIND, UNOAPI_JOB_BIND_BROKER, bindJob.consume.bind(bindJob))

  logger.info('Starting reload consumer')
  await amqpConsume(UNOAPI_JOB_RELOAD, '', reloadJob.consume.bind(reloadJob))

  logger.info('Unoapi Cloud version %s started broker!', version)
}
startBroker()

process.on('unhandledRejection', (reason: any, promise) => {
  logger.error('unhandledRejection broker: %s %s %s', reason, reason.stack, promise)
  throw reason
})
