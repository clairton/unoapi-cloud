import * as dotenv from 'dotenv'
dotenv.config()

process.env.UNOAPI_CLOUD = 'true'

import logger from './services/logger'
logger.info('Starting...')

// eslint-disable-next-line @typescript-eslint/no-unused-vars
import './web'
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import './worker'

