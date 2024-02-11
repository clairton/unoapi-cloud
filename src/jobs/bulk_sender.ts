import { jidToPhoneNumber } from '../services/transformer'
import { amqpEnqueue } from '../amqp'
import {
  UNOAPI_BULK_BATCH,
  UNOAPI_BULK_DELAY,
  UNOAPI_JOB_BULK_SENDER,
  UNOAPI_JOB_BULK_REPORT,
  UNOAPI_BULK_MESSAGE_DELAY,
  UNOAPI_JOB_BULK_WEBHOOK,
} from '../defaults'
import { Incoming } from '../services/incoming'
import { Outgoing } from '../services/outgoing'
import { setMessageStatus, setbulkMessage } from '../services/redis'
import logger from '../services/logger'

export class BulkSenderJob {
  private outgoing: Outgoing
  private incoming: Incoming

  constructor(incoming: Incoming, outgoing: Outgoing) {
    this.incoming = incoming
    this.outgoing = outgoing
  }

  async consume(data: object) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { phone, payload } = data as any
    const { id, messages, length } = payload
    try {
      const batch = Math.floor(Math.random() * UNOAPI_BULK_BATCH) + 1
      const messagesToSend = messages.slice(0, batch)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let statusMessage: any = `Bulk ${id} enqueuing phone ${phone} with ${messagesToSend.length} message(s)...`
      logger.debug(statusMessage)
      let count = 0
      const message = {
        type: 'text',
        text: {
          body: statusMessage,
        },
      }
      this.outgoing.formatAndSend(phone, phone, message)
      let delay = 0
      let totalDelay = 0
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const promises = messagesToSend.map(async (m: any) => {
        delay = Math.floor(Math.random() * count++) * (UNOAPI_BULK_MESSAGE_DELAY * 1000)
        totalDelay = totalDelay + delay
        const options = { delay, composing: true, priority: 1 } // low priority, send where not has agent message is queue
        const response = await this.incoming.send(phone, m.payload, options)
        const messageId = response.ok.messages[0].id
        const messageType = m.payload.type
        const webhookMessage = {
          object: 'whatsapp_business_account',
          entry: [
            {
              id: phone,
              changes: [
                {
                  value: {
                    messaging_product: 'whatsapp',
                    metadata: {
                      display_phone_number: phone,
                      phone_number_id: phone,
                    },
                    contacts: [
                      {
                        profile: {
                          name: m.payload.to,
                        },
                        wa_id: jidToPhoneNumber(m.payload.to, ''),
                      },
                    ],
                    messages: [
                      {
                        from: phone,
                        id: response.ok.messages[0].id,
                        timestamp: new Date().getTime,
                        [messageType]: m.payload[messageType],
                        type: m.payload.type,
                      },
                    ],
                  },
                  field: 'messages',
                },
              ],
            },
          ],
        }
        let f = async () => {
          return this.outgoing.send(phone, webhookMessage)
        }
        if (['audio', 'image', 'video', 'document'].includes(messageType)) {
          webhookMessage.entry[0].changes[0].value.messages[0][messageType].id = `${phone}/${messageId}`
          f = () => amqpEnqueue(UNOAPI_JOB_BULK_WEBHOOK, phone, { phone, payload: webhookMessage })
        }
        await f()
        await setbulkMessage(phone, id, messageId, m.payload.to)
        await setMessageStatus(phone, messageId, 'scheduled')
        return response
      })
      await Promise.all(promises)
      const delayToResend = totalDelay + UNOAPI_BULK_DELAY * 1000
      if (messages.length > batch) {
        const messagesToRenqueue = messages.slice(batch)
        await amqpEnqueue(
          UNOAPI_JOB_BULK_SENDER,
          phone,
          {
            phone,
            payload: { phone, messages: messagesToRenqueue, id, length },
          },
          { delay: delayToResend },
        )
        statusMessage = `Bulk ${id} phone ${phone} reenqueuing ${messagesToRenqueue.length} message(s) with delay ${delayToResend}...`
      } else {
        statusMessage = `Bulk ${id} phone ${phone} is finished with ${messagesToSend.length} message(s)!`
        await amqpEnqueue(UNOAPI_JOB_BULK_REPORT, phone, { phone, payload: { id, length } }, { delay: UNOAPI_BULK_DELAY * 1000 })
      }
      const messageUpdate = {
        type: 'text',
        text: {
          body: statusMessage,
        },
      }
      logger.debug(statusMessage)
      await this.outgoing.formatAndSend(phone, phone, messageUpdate)
    } catch (error) {
      const text = `Error on send bulk ${phone}: ${JSON.stringify(error)}`
      logger.error(error, 'Error on send bulk')
      const messageError = {
        type: 'text',
        text: {
          body: text,
        },
      }
      await this.outgoing.formatAndSend(phone, phone, messageError)
      throw error
    }
  }
}
