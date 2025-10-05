import { Incoming } from './incoming'
import { amqpGetChannel } from '../amqp'
import { jidToPhoneNumber, getGroupId } from './transformer'
import { getConfig } from './config'
import { generateUnoId } from '../utils/id'

const EXCHANGE = 'unoapi.outgoing'
let initialized = false

const initExchange = async () => {
  if (initialized) {
    return
  }
  const channel = await amqpGetChannel()
  await channel?.assertExchange(EXCHANGE, 'topic', { durable: true })
  await channel?.assertQueue('outgoing.baileys', { durable: true })
  await channel?.bindQueue('outgoing.baileys', EXCHANGE, 'provider.baileys.*')
  await channel?.assertQueue('outgoing.baileys.dlq', { durable: true })
  // Do not declare or bind whatsmeow queues here; adapter owns its queue/bindings
  initialized = true
}

export class IncomingAmqp implements Incoming {
  private getConfig: getConfig

  constructor(getConfig: getConfig) {
    this.getConfig = getConfig
  }

  public async send(phone: string, payload: object, options: object = {}) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const pl: any = { ...payload }
    // Normalize Graph API reply context for providers expecting either
    // context.id or context.message_id. Ensure both are present when one is.
    if (pl && typeof pl === 'object' && pl.context && typeof pl.context === 'object') {
      if (pl.context.message_id && !pl.context.id) {
        pl.context.id = pl.context.message_id
      } else if (pl.context.id && !pl.context.message_id) {
        pl.context.message_id = pl.context.id
      }
    }
    // Fallback: if "to" is blank, try to extract group id from Chatwoot payload
    if (!pl?.to || `${pl.to}`.trim() === '') {
      const gid = getGroupId(pl)
      if (gid && typeof gid === 'string') {
        pl.to = gid
      }
    }
    const { status, type, to } = pl as any
    const config = await this.getConfig(phone)
    const provider = config.provider || 'baileys'
    await initExchange()
    const channel = await amqpGetChannel()
    const routingKey = `provider.${provider}.${phone}`
    if (status) {
      options['type'] = 'direct'
      options['priority'] = 3 // update status is always middle important
      const data = { payload: pl, options }
      channel?.publish(EXCHANGE, routingKey, Buffer.from(JSON.stringify(data)), {
        contentType: 'application/json',
        messageId: (payload as any).message_id,
        persistent: true,
      })
      return { ok: { success: true } }
    } else if (type) {
      const id = generateUnoId('INC')
      if (!options['priority']) {
        options['priority'] = 5 // send message without bulk is very important
      }
      const data = { payload: pl, id, options }
      channel?.publish(EXCHANGE, routingKey, Buffer.from(JSON.stringify(data)), {
        contentType: 'application/json',
        messageId: id,
        persistent: true,
      })
      const ok = {
        messaging_product: 'whatsapp',
        contacts: [
          {
            wa_id: jidToPhoneNumber(pl.to, ''),
          },
        ],
        messages: [
          {
            id,
          },
        ],
      }
      return { ok }
    } else {
      throw `Unknown incoming message ${JSON.stringify(pl)}`
    }
  }
}
