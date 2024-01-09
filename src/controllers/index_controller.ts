import { Request, Response } from 'express'
import logger from '../services/logger'

class IndexController {
  public ping(req: Request, res: Response) {
    logger.debug('ping method %s', JSON.stringify(req.method))
    logger.debug('ping headers %s', JSON.stringify(req.headers))
    logger.debug('ping params %s', JSON.stringify(req.params))
    logger.debug('ping body %s', JSON.stringify(req.body))
    res.set('Content-Type', 'text/plain')
    return res.status(200).send('pong!')
  }
}

export const indexController = new IndexController()
