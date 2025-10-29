import { Client, Contact } from './client'
import { getConfig } from './config'
import { Listener } from './listener'
import logger from './logger'
import { isUnoId } from '../utils/id'

export class ClientForward implements Client {
  private phone: string
  private listener: Listener
  private getConfig: getConfig

  constructor(phone: string, getConfig: getConfig, listener: Listener) {
    this.phone = phone
    this.getConfig = getConfig
    this.listener = listener
  }

  public async send(payload: any, options: any) {
    // message for transcribe texto, cause error on send read event
    // {"messaging_product":"whatsapp","status":"read","message_id":"78f8f8f0-9c98-11f0-aa54-c714bee1dcd0","recipient_id":"....."}
    if (isUnoId(payload?.message_id)) {
      logger.debug('Ignore status message %s because is internal unoapi message', payload['message_id'])
      return { ok: { success: true }, error: undefined }
    }

    const config = await this.getConfig(this.phone)
    const body = JSON.stringify(payload)
    const headers = {
      'Content-Type': 'application/json; charset=utf-8',
      Authorization: `Bearer ${config.webhookForward.token}`,
    }
    const endpoint = options.endpoint && payload.type ? options.endpoint : 'messages'
    const url = `${config.webhookForward.url}/${config.webhookForward.version}/${config.webhookForward.phoneNumberId}/${endpoint}`
    logger.debug(`Send url ${url} with headers %s and body %s`, JSON.stringify(headers), body)
    let response: Response
    try {
      const options: RequestInit = { method: 'POST', body, headers }
      if (config.webhookForward?.timeoutMs) {
        options.signal = AbortSignal.timeout(config.webhookForward?.timeoutMs)
      }
      response = await fetch(url, options)
    } catch (error) {
      logger.error(error, `Error on send to url ${url} with headers %s and body %s`, JSON.stringify(headers), body)
      throw error
    }
    logger.debug('Response status: %s', response?.status)
    if (!response?.ok) {
      const content = await response.json()
      logger.error('Error on send body %s => %s', body, JSON.stringify(content))
      return { error: content, ok: undefined }
    } else {
      return { ok: await response.json(), error: undefined }
    }
  }

  public async connect(_time: number) {
    const message = {
      message: {
        conversation: 'Starting unoapi forwarder......',
      },
    }
    await this.listener.process(this.phone, [message], 'status')
    return true
  }

  public getMessageMetadata<T>(_message: T): Promise<T> {
    throw new Error('ClientCloudApi not getMessageMetadata')
  }

  public contacts(_numbers: string[]): Promise<Contact[]> {
    throw new Error('ClientCloudApi not contacts')
  }

  public async disconnect() {
    throw 'ClientCloudApi not disconnect'
  }

  public async logout() {
    throw 'ClientCloudApi not logout'
  }
}
