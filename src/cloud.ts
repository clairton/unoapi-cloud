import * as dotenv from 'dotenv'
dotenv.config()

import logger from './services/logger'
logger.info('Starting...')

// eslint-disable-next-line @typescript-eslint/no-unused-vars
import './web'
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import './worker'
