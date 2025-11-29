import { Incoming } from '../services/incoming'
import logger from '../services/logger'
import { getLastTimer, delLastTimer } from '../services/redis'
import { start } from '../services/timer'

export class TimerJob {
  private incoming: Incoming
  private getLastTimerFunction: typeof getLastTimer

  constructor(incoming: Incoming, getLastTimerFunction: typeof getLastTimer = getLastTimer) {
    this.incoming = incoming
    this.getLastTimerFunction = getLastTimerFunction
  }

  async consume(phone: string, data: object) {
    const a = data as any
    const payload: any = a.payload
    const { message, to, time: messageTime, nexts } = payload
    const type = payload.type || 'text'
    const lastTime = await this.getLastTimerFunction(phone, to)
    logger.debug('timer comsumer phone %s to %s message time %s last time %s', phone, to, messageTime, lastTime)
    if (!lastTime || messageTime > lastTime) {
      logger.debug('timer consumer enqueue phone %s to %s', phone, to)
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
        logger.debug('timer consumer found nexts %s to %s with %s', phone, to, JSON.stringify(nexts))
        const first = nexts.shift()
        first.type = first.type || 'text'
        logger.debug('timer consumer %s to %s first %s and nexts %s', phone, to, JSON.stringify(first), JSON.stringify(nexts))
        return start(phone, to, first.timeout, first.message, first.type, nexts)
      } else {
        logger.debug('timer consumer not found nexts %s to %s', phone, to)
      }
    } else {
      logger.debug('timer comsumer expired phone %s to %s', phone, to)
    }
    return delLastTimer(phone, to)
  }
}
