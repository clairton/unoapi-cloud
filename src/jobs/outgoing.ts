import { Outgoing } from '../services/outgoing'
import { UNOAPI_EXCHANGE_BROKER_NAME, UNOAPI_QUEUE_OUTGOING } from '../defaults'
import { amqpPublish } from '../amqp'
import { getConfig } from '../services/config'
import { isUpdateMessage } from '../services/transformer'

export class OutgoingJob {
  private service: Outgoing
  private getConfig: getConfig

  constructor(getConfig: getConfig, service: Outgoing) {
    this.service = service
    this.getConfig = getConfig
  }

  async consume(phone: string, data: object) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const a = data as any
    if (a.split) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const messages: any[] = a.payload
      await Promise.all(
        messages.map(async (m) => {
          return amqpPublish(UNOAPI_EXCHANGE_BROKER_NAME, UNOAPI_QUEUE_OUTGOING, phone, { payload: m, split: false })
        })
      )
    } else {
      const config = await this.getConfig(phone)
      let payload = a.payload
      if (config.provider == 'forwarder') {
        const store = await config.getStore(phone, config)
        const { dataStore } = store
        if (isUpdateMessage(payload)) {
          payload.entry[0].changes[0].value.statuses = await Promise.all(
            payload.entry[0].changes[0].value.statuses.map(async status => {
              const currentId = status.id
              const unoId = await dataStore.loadUnoId(currentId)
              if (unoId) {
                status.id = unoId
              }
              return status
            })
          )
        }
      }
      await this.service.send(phone, payload)
    }
  }
}
