import { amqpEnqueue } from '../amqp'
import { SEND_REPLAY_MESSAGE_TO_DECRYPT, UNOAPI_JOB_INCOMING, UNOAPI_JOB_LISTENER, UNOAPI_JOB_OUTGOING } from '../defaults'
import { Listener } from '../services/listener'
import { DecryptError } from '../services/transformer'

export class ListenerJob {
  private listener: Listener
  private queueListener: string
  private queueOutgoing: string
  private queueIncoming: string

  constructor(listener: Listener, queueOutgoing = UNOAPI_JOB_OUTGOING, queueIncoming = UNOAPI_JOB_INCOMING, queueListener = UNOAPI_JOB_LISTENER) {
    this.listener = listener
    this.queueListener = queueListener
    this.queueOutgoing = queueOutgoing
    this.queueIncoming = queueIncoming
  }

  async consume(phone: string, data: object, options?: { countRetries: number; maxRetries: number }) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const a = data as any
    const { messages, type } = a
    if (a.splited) {
      try {
        await this.listener.process(phone, messages, type)
      } catch (error) {
        if (error instanceof DecryptError && options) {
          // send message . to get key do decrypt message if already
          if (SEND_REPLAY_MESSAGE_TO_DECRYPT && options?.countRetries === 2) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const content: any = error.getContent() as any
            const message = content?.entry?.changes[0]?.value?.messages[0]
            const contact = content?.entry?.changes[0]?.value?.contacts[0]
            if (message.id && contact.wa_id) {
              const payload = {
                messaging_product: 'whatsapp',
                context: {
                  message_id: message.id,
                },
                to: contact.wa_id,
                type: 'text',
                text: {
                  body: SEND_REPLAY_MESSAGE_TO_DECRYPT,
                },
              }
              await amqpEnqueue(this.queueIncoming, phone, { payload })
            }
          } else if (options?.countRetries >= options?.maxRetries) {
            // send message asking to open whatsapp to see
            await amqpEnqueue(this.queueOutgoing, phone, { payload: error.getContent(), split: false })
          }
        }
        throw error
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
