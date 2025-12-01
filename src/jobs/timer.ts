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
    const { message, to, time, nexts } = payload
    const type = payload.type || 'text'
    const messageDate = Date.parse(time)
    const string = await this.getLastTimerFunction(phone, to)
    const lastTime = string ? Date.parse(string) : undefined
    logger.debug('timer phone %s to %s comsumer time %s last time %s', phone, to, time, lastTime)
    if (!lastTime || lastTime > messageDate) {
      logger.debug('timer phone %s to %s comsumer expired ', phone, to)
    } else {
      logger.debug('timer phone %s to %s consumer enqueue', phone, to)
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
    return delLastTimer(phone, to)
  }
}
