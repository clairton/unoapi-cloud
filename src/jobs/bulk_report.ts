import { UNOAPI_JOB_BULK_REPORT, UNOAPI_BULK_DELAY } from '../defaults'
import { Outgoing } from '../services/outgoing'
import { getBulkReport } from '../services/redis'
import { amqpEnqueue } from '../amqp'
import { v1 as uuid } from 'uuid'
import { getConfig } from '../services/config'

export class BulkReportJob {
  private outgoing: Outgoing
  private getConfig: getConfig

  constructor(outgoing: Outgoing, getConfig: getConfig) {
    this.outgoing = outgoing
    this.getConfig = getConfig
  }

  async consume(phone: string, data: object) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { payload } = data as any
    const { id, length } = payload
    const count = payload.count ? payload.count + 1 : 1
    const bulk = await getBulkReport(phone, id)
    if (bulk) {
      const { report, status } = bulk
      let typeMessage
      let message
      if (!payload.unverified && status.scheduled) {
        typeMessage = 'text'
        if (count >= 10) {
          message = { body: `Bulk ${id} phone ${phone} with ${length}, has retried generate ${count} and not retried more` }
        } else {
          message = { body: `Bulk ${id} phone ${phone} with ${length}, some messages is already scheduled status, try again later, this is ${count} try...` }
          await amqpEnqueue(UNOAPI_JOB_BULK_REPORT, phone, { payload: { id, length, count } }, { delay: UNOAPI_BULK_DELAY * 1000 })
        }
      } else {
        const caption = `Bulk ${id} phone ${phone} with ${length} message(s) status -> ${JSON.stringify(status)}`
        const lines: string[] = Object.keys(report).map((key) => `${key};${report[key]}`)
        const file = lines.join('\n')
        const buffer = Buffer.from(file)
        const base64 = `data:text/csv;base64,${buffer.toString('base64')}`
        typeMessage = 'document'
        const mediaId = uuid().replaceAll('-', '')
        const mediaKey = `${phone}/${mediaId}`
        const filename = `${mediaKey}.csv`
        const config = await this.getConfig(phone)
        const store = await config.getStore(phone, config)
        await store.mediaStore.saveMediaBuffer(filename, buffer)
        message = {
          url: base64,
          mime_type: 'text/csv',
          filename, 
          caption,
          id: mediaKey,
        }
      }
      const update = {
        type: typeMessage,
        from: phone,
        [typeMessage]: message,
      }
      this.outgoing.formatAndSend(phone, phone, update)
    } else {
      const message = {
        type: 'text',
        text: {
          body: `Bulk id ${id} not found`,
        },
      }
      this.outgoing.formatAndSend(phone, phone, message)
    }
  }
}
