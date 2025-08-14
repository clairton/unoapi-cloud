import { Incoming } from '../services/incoming'
import logger from '../services/logger'
import { getLastTimer, delLastTimer } from '../services/redis'

export class TimerJob {
  private incoming: Incoming

  constructor(incoming: Incoming) {
    this.incoming = incoming
  }

  async consume(phone: string, data: object) {
    const a = data as any
    const payload: any = a.payload
    const { message, to, time } = payload
    const date = Date.parse(time)
    const expiredDate = await getLastTimer(phone, to)
    if (expiredDate && expiredDate > date) {
      logger.debug('timer comsumer phone %s to %s already expired', phone, to)
      await delLastTimer(phone, to)
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
