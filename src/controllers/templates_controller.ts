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
    logger.debug('templates method %s', req.method)
    logger.debug('templates headers %s', req.headers)
    logger.debug('templates params %s', req.params)
    logger.debug('templates body %s', JSON.stringify(req.body))
    logger.debug('templates query %s', JSON.stringify(req.query))
    const { phone } = req.params
    const config = await this.getConfig(phone)
    const store = await config.getStore(phone, config)
    const templates = await store.dataStore.loadTemplates()
    return res.status(200).json({ data: templates })
  }
}
