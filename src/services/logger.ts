import P from 'pino'

const logger = P({ timestamp: () => `,"time":"${new Date().toJSON()}"` })
logger.level = process.env.LOG_LEVEL || (process.env.NODE_ENV == 'development' ? 'debug' : 'error')

export default logger
