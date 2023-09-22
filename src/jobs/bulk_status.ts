import { setMessageStatus } from '../services/redis'
import logger from '../services/logger'

export class BulkStatusJob {
  async consume(data: object) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { phone, payload } = data as any
    const state = payload.entry[0].changes[0].value.statuses[0]
    logger.debug(`State: ${JSON.stringify(state)}`)
    const messageId = state.id
    const status = state.status
    if (status == 'failed') {
      const error = state.errors[0]
      if (['2', 2].includes(error.code)) {
        return setMessageStatus(phone, messageId, 'without-whatsapp')
      } else if (['7', 7].includes(error.code)) {
        return setMessageStatus(phone, messageId, 'invalid-phone-number')
      }
    }
  }
}
