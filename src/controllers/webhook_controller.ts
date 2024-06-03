import { Request, Response } from 'express'
import logger from '../services/logger'

export class WebhookController {
  public whatsapp(req: Request, res: Response) {
    logger.debug('webhook whatsapp method %s', req.method)
    logger.debug('webhook whatsapp headers %s', JSON.stringify(req.headers))
    logger.debug('webhook whatsapp params %s', JSON.stringify(req.params))
    logger.debug('webhook whatsapp body %s', JSON.stringify(req.body))
    res.status(200).send(`{"success": true}`)
  }
}
