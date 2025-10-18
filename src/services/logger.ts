import { pino } from 'pino'
import { join } from 'node:path'
import { UNO_LOG_LEVEL, UNOAPI_LOG_MODES } from '../defaults'

const targets: Record<string, any>[] = []

if (UNOAPI_LOG_MODES.includes('sysout')) {
  targets.push({
    level: UNO_LOG_LEVEL,
    target: 'pino-pretty',
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
        count: 1000
      }
    }
  })
}
const transport = { targets } as any
const logger = pino({ timestamp: () => `,"time":"${new Date().toJSON()}"`, transport })

export default logger
