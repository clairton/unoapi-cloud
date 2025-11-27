import { pino } from 'pino'
import { join } from 'node:path'
import process from 'node:process'
class AppLogger {
  private static instance
  private static logLevel

  private constructor() {}

  public static getLogLevel() {
    return AppLogger.logLevel
  }

  public static getInstance() {
    if (!AppLogger.instance) {
      try {
        process.loadEnvFile(process.env.DOTENV_CONFIG_PATH || './.env')
      } catch (_) {}
      AppLogger.logLevel = process.env.LOG_LEVEL || (process.env.NODE_ENV == 'development' ? 'debug' : 'error')
      const UNO_LOG_LEVEL = process.env.UNO_LOG_LEVEL || AppLogger.logLevel
      const UNOAPI_LOG_MODES = JSON.parse(process.env.UNOAPI_LOG_MODES || '["sysout"]')
      const targets: Record<string, any>[] = []
      if (UNOAPI_LOG_MODES.includes('sysout')) {
        targets.push({
          level: UNO_LOG_LEVEL,
          target: 'pino-pretty',
           minimumLevel: UNO_LOG_LEVEL,
          options: {
            colorize: true,
            ignore: 'pid,hostname',
          },
        })
      }
      if (UNOAPI_LOG_MODES.includes('file')) {
        targets.push({
          target: 'pino-roll',
          level: UNO_LOG_LEVEL,
          sync: false,
          options: {
            ignore: 'pid,hostname',
            file: join('data', 'logs', 'unoapi'),
            frequency: 'hourly', // Rotate daily ('1d' for one day)
            size: '1m', // Optional: Rotate also at 10MB file size
            mkdir: true, // Create the logs directory if it doesn't exist
            limit: {
              count: 1000,
            },
          },
        })
      }
      const transport = { targets } as any
      AppLogger.instance = pino({ level: UNO_LOG_LEVEL, timestamp: () => `,"time":"${new Date().toJSON()}"`, transport })
    }
    return AppLogger.instance
  }
}

const logger = AppLogger.getInstance()
export const logLevel = AppLogger.getLogLevel()
export default logger
