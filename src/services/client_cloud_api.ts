import { Client, Contact } from './client';
import { getConfig } from './config';
import logger from './logger';

export class ClientCloudApi implements Client {
  private phone: string
  private getConfig: getConfig

  constructor(phone: string, getConfig: getConfig) {
    this.phone = phone
    this.getConfig = getConfig
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  public async send(payload: any, _options: any) {
    const config = await this.getConfig(this.phone)
    const body = JSON.stringify(payload)
    const headers = {
      'Content-Type': 'application/json; charset=utf-8',
      'Authorization': `Bearer ${config.webhookCloudApi?.token}`
    }
    const url = `https://graph.facebook.com/${config.webhookCloudApi?.version}/${config.webhookCloudApi?.phoneNumberId}/messages`
    logger.debug(`Send url ${url} with headers %s and body %s`, JSON.stringify(headers), body)
    let response: Response
    try {
      const options: RequestInit = { method: 'POST', body, headers }
      if (config.webhookCloudApi?.timeoutMs) {
        options.signal = AbortSignal.timeout(config.webhookCloudApi?.timeoutMs)
      }
      response = await fetch(url, options)
    } catch (error) {
      logger.error(error, `Error on send to url ${url} with headers %s and body %s`, JSON.stringify(headers), body)
      throw error
    }
    logger.debug('Response: %s', response?.status)
    if (!response?.ok) {
      throw await response?.text()
    } else {
      return response.json()
    }
  }

  public getMessageMetadata<T>(_message: T): Promise<T> {
    throw new Error('ClientCloudApi not getMessageMetadata')
  }

  public contacts(_numbers: string[]): Promise<Contact[]> {
    throw new Error('ClientCloudApi not contacts')
  }

  public async connect(_time: number) {
    throw 'ClientCloudApi not connect'
  }

  public async disconnect() {
    throw 'ClientCloudApi not disconnect'
  }
  
  public async logout() {
    throw 'ClientCloudApi not logout'
  }
}
