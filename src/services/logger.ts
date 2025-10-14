import P from 'pino'
import { UNO_LOG_LEVEL } from '../defaults'

const multiTransport = P.transport({
  targets: [
    {
      target: 'pino-roll',
      level: UNO_LOG_LEVEL,
      options: { 
        destination: './data/logs/unoapi.log',
        frequency: '1d',       // Rotate daily ('1d' for one day)
        size: '10MB',          // Optional: Rotate also at 10MB file size
        mkdir: true            // Create the logs directory if it doesn't exist
      }
    },
    {
      level: UNO_LOG_LEVEL,
      target: 'pino-pretty',
      options: { colorize: true },
    },
  ],
})
const logger = P({ timestamp: () => `,"time":"${new Date().toJSON()}"` }, multiTransport)

export default logger
