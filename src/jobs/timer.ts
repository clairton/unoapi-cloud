import { getConfig } from '../services/config'
import { Incoming } from '../services/incoming'
import logger from '../services/logger'
import { getLastTimer } from '../services/redis'
import { start } from '../services/timer'

export class TimerJob {
  private incoming: Incoming
  private getConfig: getConfig
  private getLastTimerFunction: typeof getLastTimer

  constructor(incoming: Incoming, getConfig: getConfig, getLastTimerFunction: typeof getLastTimer = getLastTimer) {
    this.incoming = incoming
    this.getLastTimerFunction = getLastTimerFunction
    this.getConfig = getConfig
  }

  async consume(phone: string, data: object) {
    const a = data as any
    const payload: any = a.payload
    const { message, to, time: messageDate, nexts } = payload
    const type = payload.type || 'text'
    const lastTime = await this.getLastTimerFunction(phone, to)
    logger.debug('timer phone %s to %s consumer time %s last time %s', phone, to, messageDate, lastTime)
    if (!lastTime || lastTime > messageDate) {
      logger.debug('timer phone %s to %s consumer expired ', phone, to)
      return
    } else {
      const config = await this.getConfig(phone)
      const { dataStore } = await config.getStore(phone, config)
      const lastMessageDirection = await dataStore.loadLastMessageDirection(to)
      logger.debug('timer phone %s to %s consumer last message direction %s', phone, to, lastMessageDirection)
      if (lastMessageDirection != 'incoming') {
        return
      }
      logger.debug('timer phone %s to %s consumer enqueue message: %s', phone, to, message)
      const body = {
        messaging_product: 'whatsapp',
        to,
        type,
        [type]: {
          body: message,
        },
      }
      await this.incoming.send(phone, body, {})
      if (nexts?.length > 0) {
        logger.debug('timer phone %s to %s consumer found nexts with %s', phone, to, JSON.stringify(nexts))
        const first = nexts.shift()
        first.type = first.type || 'text'
        logger.debug('timer phone %s to %s consumer first %s and nexts %s', phone, to, JSON.stringify(first), JSON.stringify(nexts))
        return start(phone, to, first.timeout, first.message, first.type, nexts)
      } else {
        logger.debug('timer phone %s to %s consumer not found nexts', phone, to)
      }
    }
  }
}
