// https://developers.facebook.com/docs/whatsapp/business-management-api/message-templates/

import { Request, Response } from 'express'
import { getConfig } from '../services/config'
import logger from '../services/logger'

export class TemplatesController {
  private getConfig: getConfig

  constructor(getConfig: getConfig) {
    this.getConfig = getConfig
  }

  public async index(req: Request, res: Response) {
    logger.debug('templates method', req.method)
    logger.debug('templates headers', req.headers)
    logger.debug('templates params', req.params)
    logger.debug('templates body', JSON.stringify(req.body, null, ' '))
    logger.debug('templates query', JSON.stringify(req.query, null, ' '))
    const { phone } = req.params
    const config = await this.getConfig(phone)
    const store = await config.getStore(phone, config)
    const templates = await store.dataStore.loadTemplates()
    return res.status(200).json({ data: templates })
  }
}
