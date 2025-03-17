import { Request, Response } from 'express'
import { Outgoing } from '../services/outgoing'
import logger from '../services/logger'

export class WebhookController {
  private service: Outgoing

  constructor(service: Outgoing) {
    this.service = service
  }

  public async whatsapp(req: Request, res: Response) {
    logger.debug('webhook whatsapp method %s', req.method)
    logger.debug('webhook whatsapp headers %s', JSON.stringify(req.headers))
    logger.debug('webhook whatsapp params %s', JSON.stringify(req.params))
    logger.debug('webhook whatsapp body %s', JSON.stringify(req.body))
    const { phone } = req.params
    await this.service.send(phone, req.body)
    res.status(200).send(`{"success": true}`)
  }
}
