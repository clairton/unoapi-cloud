import { Request, Response } from 'express'
import logger from '../services/logger'

export class WebhookFakeController {

  public async fake(req: Request, res: Response) {
    logger.debug('webhook fake method %s', req.method)
    logger.debug('webhook fake headers %s', JSON.stringify(req.headers))
    logger.debug('webhook fake params %s', JSON.stringify(req.params))
    logger.debug('webhook fake body %s', JSON.stringify(req.body))
    logger.debug('webhook fake quert %s', JSON.stringify(req.query))
    res.status(200).send(`{"success": true}`)
  }
}
