import { Outgoing } from '../services/outgoing'
import { getKey } from '../services/redis'

export class BulkWebhookJob {
  private outgoing: Outgoing

  constructor(outgoing: Outgoing) {
    this.outgoing = outgoing
  }

  async consume(phone: string, data: object) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { payload } = data as any
    const messageId = payload?.entry[0]?.changes[0]?.value?.messages[0]?.id
    const key = await getKey(phone, messageId)
    if (key) {
      return this.outgoing.send(phone, payload)
    }
    throw `key id not found ${messageId}`
  }
}
