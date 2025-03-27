import { Client, Contact } from './client';
import { getConfig } from './config';
import { Listener } from './listener';
import logger from './logger';

export class ClientForward implements Client {
  private phone: string
  private listener: Listener
  private getConfig: getConfig

  constructor(phone: string, getConfig: getConfig, listener: Listener) {
    this.phone = phone
    this.getConfig = getConfig
    this.listener = listener
  }

  public async send(payload: any, _options: any) {
    const config = await this.getConfig(this.phone)
    const body = JSON.stringify(payload)
    const headers = {
      'Content-Type': 'application/json; charset=utf-8',
      'Authorization': `Bearer ${config.webhookForward.token}`
    }
    const url = `${config.webhookForward.url}/${config.webhookForward.version}/${config.webhookForward.phoneNumberId}/messages`
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
      return { error: await response.json(), ok: undefined }
    } else {
      return { ok: await response.json(), error: undefined }
    }
  }

  public async connect(_time: number) {
    const message = {
      message: {
        conversation: 'Starting unoapi forwarder......'
      }
    }
    return this.listener.process(this.phone, [message] , 'status')
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
