import { Incoming } from '../services/incoming'
import { Outgoing } from '../services/outgoing'
import { UNOAPI_JOB_COMMANDER, UNOAPI_JOB_BULK_STATUS, UNOAPI_JOB_INCOMING, UNOAPI_MESSAGE_RETRY_LIMIT } from '../defaults'
import { amqpEnqueue } from '../amqp'
import { getConfig } from '../services/config'
import { jidToPhoneNumber } from '../services/transformer'
import logger from '../services/logger'

export class IncomingJob {
  private incoming: Incoming
  private outgoing: Outgoing
  private getConfig: getConfig
  private queueCommander: string

  constructor(incoming: Incoming, outgoing: Outgoing, getConfig: getConfig, queueCommander = UNOAPI_JOB_COMMANDER) {
    this.incoming = incoming
    this.outgoing = outgoing
    this.getConfig = getConfig
    this.queueCommander = queueCommander
  }

  async consume(phone: string, data: object) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const a = data as any
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const payload: any = a.payload
    const options: object = a.options
    const idUno: string = a.id
    const retries: number = a.retries ? a.retries + 1 : 1
    const response = await this.incoming.send(phone, payload, options)
    logger.debug('Baileys response %s', phone, JSON.stringify(response))
    const channelNumber = phone.replace('+', '')
    logger.debug('Compare to enqueue to commander %s == %s', channelNumber, payload?.to)
    if (channelNumber == payload?.to) {
      logger.debug(`Enqueue in commmander...`)
      await amqpEnqueue(this.queueCommander, phone, { payload })
    }
    const { ok, error } = response
    if (ok && ok.messages && ok.messages[0] && ok.messages[0].id) {
      const idBaileys: string = ok.messages[0].id
      logger.debug('Baileys id %s to Unoapi id %s', idBaileys, idUno)
      const config = await this.getConfig(phone)
      const { dataStore } = await config.getStore(phone, config)
      await dataStore.setUnoId(idBaileys, idUno)
      const key = await dataStore.loadKey(idBaileys)
      if (key) {
        dataStore.setKey(idBaileys, key)
        dataStore.setKey(idUno, key)
      }
    } else if (!ok.success) {
      throw `Unknow response ${JSON.stringify(response)}`
    } else if (ok.success) {
      logger.debug('Message id %s update to status %s', payload?.message_id, payload?.status)
      return
    }
    let outgingPayload
    if (error) {
      error.entry[0].changes[0].value.statuses[0].id = idUno
      outgingPayload = error
      const status = error.entry[0].changes[0].value.statuses[0]
      const code = status?.errors[0]?.code
      // retry when error: 5 - Wait a moment, connecting process
      if (retries < UNOAPI_MESSAGE_RETRY_LIMIT && ['5'].includes(code)) {
        await amqpEnqueue(UNOAPI_JOB_INCOMING, phone, { ...data, retries }, options)
      }
    } else {
      outgingPayload = {
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
                      wa_id: jidToPhoneNumber(payload?.to, ''),
                    },
                  ],
                  statuses: [
                    {
                      id: idUno,
                      recipient_id: payload?.to,
                      status: 'sent',
                      timestamp: new Date().getTime(),
                    },
                  ],
                },
                field: 'messages',
              },
            ],
          },
        ],
      }
    }
    amqpEnqueue(UNOAPI_JOB_BULK_STATUS, phone, { phone, payload: outgingPayload, type: 'whatsapp' })
    await this.outgoing.send(phone, outgingPayload)
  }
}
