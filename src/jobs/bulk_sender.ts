import { amqpPublish } from '../amqp'
import { UNOAPI_BULK_BATCH, UNOAPI_BULK_DELAY, UNOAPI_JOB_BULK_SENDER, UNOAPI_JOB_BULK_REPORT, UNOAPI_BULK_MESSAGE_DELAY, UNOAPI_EXCHANGE_BROKER_NAME } from '../defaults'
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

  async consume(phone: string, data: object) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { payload } = data as any
    const { id, messages, length } = payload
    try {
      const batch = Math.floor(Math.random() * UNOAPI_BULK_BATCH) + 1
      const messagesToSend = messages.slice(0, batch)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let statusMessage: any = `Bulk ${id} enqueuing phone ${phone} with ${messagesToSend.length} message(s)...`
      logger.debug(statusMessage)
      let count = 0
      const message = {
        from: phone,
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
        const options = { delay, composing: true, priority: 1, sendMessageToWebhooks: true } // low priority, send where not has agent message is queue
        const response = await this.incoming.send(phone, m.payload, options)
        const messageId = response.ok.messages[0].id
        await setbulkMessage(phone, id, messageId, m.payload.to)
        await setMessageStatus(phone, messageId, 'scheduled')
        return response
      })
      await Promise.all(promises)
      const delayToResend = totalDelay + UNOAPI_BULK_DELAY * 1000
      if (messages.length > batch) {
        const messagesToRenqueue = messages.slice(batch)
        await amqpPublish(
          UNOAPI_EXCHANGE_BROKER_NAME,
          UNOAPI_JOB_BULK_SENDER,
          phone,
          {
            payload: { phone, messages: messagesToRenqueue, id, length },
          },
          { delay: delayToResend },
        )
        statusMessage = `Bulk ${id} phone ${phone} reenqueuing ${messagesToRenqueue.length} message(s) with delay ${delayToResend}...`
      } else {
        statusMessage = `Bulk ${id} phone ${phone} is finished with ${messagesToSend.length} message(s)!`
        await amqpPublish(
          UNOAPI_EXCHANGE_BROKER_NAME,
          UNOAPI_JOB_BULK_REPORT, phone, 
          { payload: { id, length } }, 
          { delay: UNOAPI_BULK_DELAY * 1000 }
        )
      }
      const messageUpdate = {
        type: 'text',
        from: phone,
        text: {
          body: statusMessage,
        },
      }
      await this.outgoing.formatAndSend(phone, phone, messageUpdate)
    } catch (error) {
      const text = `Error on send bulk ${phone}: ${JSON.stringify(error)}`
      logger.error(error, 'Error on send bulk')
      const messageError = {
        type: 'text',
        from: phone,
        text: {
          body: text,
        },
      }
      await this.outgoing.formatAndSend(phone, phone, messageError)
      throw error
    }
  }
}
