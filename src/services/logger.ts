import P, { Level } from 'pino'

import { UNO_LOG_LEVEL } from '../defaults'

const logger = P({ timestamp: () => `,"time":"${new Date().toJSON()}"` })
logger.level = UNO_LOG_LEVEL as Level

export default logger
