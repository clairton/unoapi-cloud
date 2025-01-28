import { Config } from './config'
import { Incoming } from './incoming'
import logger from './logger'

export interface ReadWhenReceipt {
  test()
  send(phone: string, from: string, messageId: string): Promise<void>
}

export const readWhenReceiptDisabled = new class implements ReadWhenReceipt {
  async send(_phone, _from, _messageId) {}
  test() {}
}()

export class ReadWhenReceiptEnabled implements ReadWhenReceipt {
  private incoming: Incoming

  constructor(incoming: Incoming) {
    this.incoming = incoming
  }

  test() {}

  async send(phone, from, messageId){
    logger.debug('Send reading phone: %s from: %s message: %s', phone, from, messageId)
    const payload = {
      messaging_product: 'whatsapp',
      status: 'read',
      message_id: messageId
    }
    await this.incoming.send(from, payload, {})
  }
}

const instances: Map<string, ReadWhenReceipt> = new Map()

export interface getReadWhenReceipt {
  (phone: string, config: Config, incoming: Incoming)
}

export const getReadWhenReceiptDisabled = (_phone, _config, _incoming): ReadWhenReceipt => {
  return readWhenReceiptDisabled
}

export const getReadWhenReceipt = (phone, config, incoming): ReadWhenReceipt => {
  const instance = instances.get(phone)!
  try {
    instance.test()
  } catch (e) {
    if (e instanceof TypeError && e.message == "Cannot read properties of undefined (reading 'test')") {
      const i: ReadWhenReceipt = config.readWhenReceipt ? new ReadWhenReceiptEnabled(incoming) :  readWhenReceiptDisabled
      instances.set(phone, i)
    } else {
      throw e
    }
  }
  return instances.get(phone)!
}