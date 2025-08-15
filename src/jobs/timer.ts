import { Incoming } from '../services/incoming'
import logger from '../services/logger'
import { getLastTimer, delLastTimer } from '../services/redis'

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
    const { message, to, time } = payload
    const messageDate = Date.parse(time)
    const string = await this.getLastTimerFunction(phone, to)
    const lastTime = string ? Date.parse(string) : undefined
    if (lastTime && lastTime > messageDate) {
      logger.debug('timer comsumer phone %s to %s already expired', phone, to)
    } else {
      logger.debug('timer consumer phone %s to %s enqueue', phone, to)
      const body = {
        messaging_product: 'whatsapp',
        to,
        type: 'text',
        text: {
          body: message
        } 
      }
      await this.incoming.send(phone, body, {})
    }
    return delLastTimer(phone, to)
  }
}
