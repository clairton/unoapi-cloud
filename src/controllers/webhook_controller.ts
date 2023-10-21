import { Request, Response } from 'express'
import logger from '../services/logger'

class WebwookController {
  public whatsapp(req: Request, res: Response) {
    logger.debug('webhook method %s', req.method)
    logger.debug('webhook headers %s', req.headers)
    logger.debug('webhook params %s', req.params)
    logger.debug('webhook body %s', JSON.stringify(req.body))
    res.status(200).send(`{"success": true}`)
  }
}

export const webhookController = new WebwookController()
