import { Request, Response } from 'express'
import logger from '../services/logger'

class WebwookController {
  public whatsapp(req: Request, res: Response) {
    logger.debug('webhook method', req.method)
    logger.debug('webhook headers', req.headers)
    logger.debug('webhook params', req.params)
    logger.debug('webhook body', JSON.stringify(req.body, null, ' '))
    res.status(200).send(`{"success": true}`)
  }
}

export const webhookController = new WebwookController()
