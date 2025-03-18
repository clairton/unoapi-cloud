import * as dotenv from 'dotenv'
dotenv.config()

import { BindBrokerJob } from './jobs/bind_broker'
import { 
  UNOAPI_JOB_BIND_BROKER,
  UNOAPI_JOB_RELOAD,
  UNOAPI_SERVER_NAME,
  UNOAPI_JOB_MEDIA,
} from './defaults'
import { amqpConsume } from './amqp'
import { startRedis } from './services/redis'
import { getConfig } from './services/config'
import { getConfigRedis } from './services/config_redis'
import logger from './services/logger'
import { version } from '../package.json'
import { ReloadJob } from './jobs/reload'
import { MediaJob } from './jobs/media'
import { Reload } from './services/reload'

const reload = new Reload()
const reloadJob = new ReloadJob(reload)
const getConfig: getConfig = getConfigRedis
const bindJob = new BindBrokerJob()
const mediaJob = new MediaJob(getConfig)

const startBroker = async () => {
  await startRedis()

  logger.info('Unoapi Cloud version %s starting broker...', version)

  logger.info('Starting bind broker consumer')
  await amqpConsume(UNOAPI_JOB_BIND_BROKER, '', bindJob.consume.bind(bindJob), { type: 'direct' })

  logger.info('Starting reload consumer')
  await amqpConsume(UNOAPI_JOB_RELOAD, UNOAPI_SERVER_NAME, reloadJob.consume.bind(reloadJob))

  logger.info('Starting media consumer')
  await amqpConsume(UNOAPI_JOB_MEDIA, '', mediaJob.consume.bind(mediaJob), { type: 'direct' })

  logger.info('Unoapi Cloud version %s started broker!', version)
}
startBroker()

process.on('unhandledRejection', (reason: any, promise) => {
  logger.error('unhandledRejection broker: %s %s %s', reason, reason.stack, promise)
  throw reason
})
