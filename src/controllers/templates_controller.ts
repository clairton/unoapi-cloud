// https://developers.facebook.com/docs/whatsapp/business-management-api/message-templates/

import { Request, Response } from 'express'
import { getConfig } from '../services/config'

export class TemplatesController {
  private getConfig: getConfig

  constructor(getConfig: getConfig) {
    this.getConfig = getConfig
  }

  public async index(req: Request, res: Response) {
    console.debug('templates method', req.method)
    console.debug('templates headers', req.headers)
    console.debug('templates params', req.params)
    console.debug('templates body', JSON.stringify(req.body, null, ' '))
    console.debug('templates query', JSON.stringify(req.query, null, ' '))
    const { phone } = req.params
    const config = await this.getConfig(phone)
    const store = await config.getStore(phone, config)
    const templates = await store.dataStore.loadTemplates()
    return res.status(200).json({ data: templates })
  }
}
