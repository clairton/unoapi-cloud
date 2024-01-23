import { phoneNumberToJid } from '../services/transformer'
import { UNOAPI_JOB_BULK_REPORT, UNOAPI_BULK_DELAY } from '../defaults'
import { Outgoing } from '../services/outgoing'
import { getBulkReport } from '../services/redis'
import { amqpEnqueue } from '../amqp'
import { v1 as uuid } from 'uuid'

export class BulkReportJob {
  private outgoing: Outgoing

  constructor(outgoing: Outgoing) {
    this.outgoing = outgoing
  }

  async consume(data: object) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { phone, payload } = data as any
    const { id, length } = payload
    const count = payload.count ? payload.count + 1 : 1
    const bulk = await getBulkReport(phone, id)
    if (bulk) {
      const { report, status } = bulk
      let typeMessage
      let message
      if (!payload.unverified && status.scheduled) {
        typeMessage = 'conversation'
        if (count >= 10) {
          message = `Bulk ${id} phone ${phone} with ${length}, has retried generate ${count} and not retried more`
        } else {
          message = `Bulk ${id} phone ${phone} with ${length}, some messages is already scheduled status, try again later, this is ${count} try...`
          await amqpEnqueue(UNOAPI_JOB_BULK_REPORT, phone, { phone, payload: { id, length, count } }, { delay: UNOAPI_BULK_DELAY * 1000 })
        }
      } else {
        const caption = `Bulk ${id} phone ${phone} with ${length} message(s) status -> ${JSON.stringify(status)}`
        const lines: string[] = Object.keys(report).map((key) => `${key};${report[key]}`)
        const file = lines.join('\n')
        const base64 = `data:text/csv;base64,${Buffer.from(file).toString('base64')}`
        typeMessage = 'documentMessage'
        message = {
          url: base64,
          mimetype: 'text/csv',
          fileLength: base64.length,
          fileName: `${phone}/${id}.csv`,
          caption,
        }
      }
      const update = {
        key: {
          fromMe: true,
          remoteJid: phoneNumberToJid(phone),
          id: uuid(),
        },
        message: {
          [typeMessage]: message,
        },
        messageTimestamp: new Date().getTime(),
      }
      this.outgoing.sendOne(phone, update)
    } else {
      const message = {
        key: {
          fromMe: true,
          remoteJid: phoneNumberToJid(phone),
          id: uuid(),
        },
        message: {
          conversation: `Bulk id ${id} not found`,
        },
        messageTimestamp: new Date().getTime(),
      }
      this.outgoing.sendOne(phone, message)
    }
  }
}
