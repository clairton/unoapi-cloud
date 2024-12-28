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
    logger.debug('templates method %s', JSON.stringify(req.method))
    logger.debug('templates headers %s', JSON.stringify(req.headers))
    logger.debug('templates params %s', JSON.stringify(req.params))
    logger.debug('templates body %s', JSON.stringify(req.body))
    logger.debug('templates query %s', JSON.stringify(req.query))

    return this.loadTemplates(req, res)
  }

  public async templates(req: Request, res: Response) {
    logger.debug('message_templates method %s', JSON.stringify(req.method))
    logger.debug('message_templates headers %s', JSON.stringify(req.headers))
    logger.debug('message_templates params %s', JSON.stringify(req.params))
    logger.debug('message_templates body %s', JSON.stringify(req.body))
    logger.debug('message_templates query %s', JSON.stringify(req.query))

    return this.loadTemplates(req, res)
  }

  private async loadTemplates(req: Request, res: Response) {
    const { phone } = req.params
    try {
      const config = await this.getConfig(phone)
      const store = await config.getStore(phone, config)
      const templates = await store.dataStore.loadTemplates()
      return res.status(200).json({ data: templates })
    } catch (e) {
      return res.status(400).json({ status: 'error', message: `${phone} could not create template, error: ${e.message}` })
    }
  }
}
