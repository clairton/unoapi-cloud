import { Incoming } from '../services/incoming'
import logger from '../services/logger'
import { getLastTimer, delLastTimer } from '../services/redis'
import { start, stop } from '../services/timer'

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
    const messageDate = Date.parse(time)
    const string = await this.getLastTimerFunction(phone, to)
    const lastTime = string ? Date.parse(string) : undefined
    logger.debug('timer comsumer phone %s to %s time %s last time %s', phone, to, time, lastTime)
    if (!lastTime || (lastTime > messageDate)) {
      logger.debug('timer comsumer expired phone %s to %s', phone, to)
    } else {
      logger.debug('timer consumer enqueue phone %s to %s', phone, to)
      const body = {
        messaging_product: 'whatsapp',
        to,
        type: 'text',
        text: {
          body: message
        } 
      }
      await this.incoming.send(phone, body, {})
      if (nexts?.length > 0) {
        logger.debug('timer consumer found nexts %s to %s', phone, to)
        const first = nexts.shift()
        await start(first.phone, first.to, first.timeout, first.message, nexts)
      } else {
        logger.debug('timer consumer not found nexts %s to %s', phone, to)
      }
    }
    return delLastTimer(phone, to)
  }
}
