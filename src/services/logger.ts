import P, { Level } from 'pino'

const logger = P({ timestamp: () => `,"time":"${new Date().toJSON()}"` })
logger.level = (process.env.UNO_LOG_LEVEL || process.env.LOG_LEVEL || (process.env.NODE_ENV == 'development' ? 'debug' : 'error')) as Level

export default logger
