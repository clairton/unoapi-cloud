import { Request, Response } from 'express'
import logger from '../services/logger'
import path from 'path'

class IndexController {

  public root(req: Request, res: Response) {
    logger.debug('root method %s', JSON.stringify(req.method))
    logger.debug('root headers %s', JSON.stringify(req.headers))
    logger.debug('root params %s', JSON.stringify(req.params))
    logger.debug('root body %s', JSON.stringify(req.body))
    res.set('Content-Type', 'text/html')
    //return res.sendFile(path.join(__dirname, '..', '..', 'public', 'index.html'))
    return res.sendFile(path.resolve('./public/index.html'))
  }


  public ping(req: Request, res: Response) {
    logger.debug('ping method %s', JSON.stringify(req.method))
    logger.debug('ping headers %s', JSON.stringify(req.headers))
    logger.debug('ping params %s', JSON.stringify(req.params))
    logger.debug('ping body %s', JSON.stringify(req.body))
    res.set('Content-Type', 'text/plain')
    return res.status(200).send('pong!')
  }

  public debugToken(req: Request, res: Response) {
    logger.debug('debug token method %s', JSON.stringify(req.method))
    logger.debug('debug token headers %s', JSON.stringify(req.headers))
    logger.debug('debug token params %s', JSON.stringify(req.params))
    logger.debug('debug token query %s', JSON.stringify(req.query))
    logger.debug('debug token body %s', JSON.stringify(req.body))
    res.set('Content-Type', 'application/json')
    return res.status(200).send({
      data: {
        is_valid: true,
        app_id: 'unoapi',
        application: 'unoapi',
        expires_at: 0,
        scopes: ['whatsapp_business_management', 'whatsapp_business_messaging'],
      },
    })
  }
}

export const indexController = new IndexController()
