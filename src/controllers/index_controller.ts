import { Request, Response } from 'express'
import logger from '../services/logger'

class IndexController {
  public ping(req: Request, res: Response) {
    logger.debug('ping method', req.method)
    logger.debug('ping headers', req.headers)
    logger.debug('ping params', req.params)
    logger.debug('ping body', JSON.stringify(req.body, null, ' '))
    res.set('Content-Type', 'text/plain')
    return res.status(200).send('pong!')
  }
}

export const indexController = new IndexController()
