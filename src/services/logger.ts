import P from 'pino'
import { UNO_LOG_LEVEL } from '../defaults'

const multiTransport = P.transport({
  targets: [
    // {
    //   level: UNO_LOG_LEVEL,
    //   target: 'pino/file',
    //   options: { destination: './data/logs/unoapi.log' }
    // },
    {
      level: UNO_LOG_LEVEL,
      target: 'pino-pretty',
      options: { colorize: true },
    },
  ],
})
const logger = P({ timestamp: () => `,"time":"${new Date().toJSON()}"` }, multiTransport)

export default logger
