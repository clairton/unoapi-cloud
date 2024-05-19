import { amqpEnqueue } from '../amqp'
import { UNOAPI_JOB_LISTENER } from '../defaults'
import { Listener } from '../services/listener'
import { Outgoing } from '../services/outgoing'
import { DecryptError } from '../services/transformer'

export class ListenerJob {
  private listener: Listener
  private outgoing: Outgoing
  private queueListener: string

  constructor(listener: Listener, outgoing: Outgoing, queueListener = UNOAPI_JOB_LISTENER) {
    this.listener = listener
    this.outgoing = outgoing
    this.queueListener = queueListener
  }

  async consume(phone: string, data: object, options?: { countRetries: number; maxRetries: number, priority: 0 }) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const a = data as any
    const { messages, type } = a
    if (a.splited) {
      try {
        await this.listener.process(phone, messages, type)
      } catch (error) {
        if (error instanceof DecryptError && options && options?.countRetries >= options?.maxRetries) {
          // send message asking to open whatsapp to see
          await this.outgoing.send(phone, error.getContent())
        } else {
          throw error
        }
      }
    } else {
      if (type == 'delete' && messages.keys) {
        await Promise.all(
          messages.keys.map(async (m: object) => await amqpEnqueue(this.queueListener, phone, { messages: { keys: [m] }, type, splited: true })),
        )
      } else {
        await Promise.all(messages.map(async (m: object) => await amqpEnqueue(this.queueListener, phone, { messages: [m], type, splited: true })))
      }
    }
  }
}
