import { Incoming } from '../services/incoming'
import logger from '../services/logger'
import { getTimerExpired, delTimerExpired } from '../services/redis'

export class TimerJob {
  private incoming: Incoming

  constructor(incoming: Incoming) {
    this.incoming = incoming
  }

  async consume(phone: string, data: object) {
    const a = data as any
    const payload: any = a.payload
    const { message, to } = payload
    if (await getTimerExpired(phone, to)) {
      logger.debug('timer comsumer phone %s to %s already deleted', phone, to)
      await delTimerExpired(phone, to)
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
      return this.incoming.send(phone, body, {})
    }
  }
}
