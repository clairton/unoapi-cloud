import { Request, Response } from 'express'
import logger from '../services/logger'
import path from 'path'
import { createRequire } from 'module'

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

  public socket(req: Request, res: Response) {
    logger.debug('socket method %s', JSON.stringify(req.method))
    logger.debug('socket headers %s', JSON.stringify(req.headers))
    logger.debug('socket params %s', JSON.stringify(req.params))
    logger.debug('socket body %s', JSON.stringify(req.body))
    try {
      // use __filename to support CommonJS output as configured by the build
      const reqr = createRequire(__filename as unknown as string)
      const clientPath = reqr.resolve('socket.io-client/dist/socket.io.min.js')
      res.type('application/javascript')
      return res.sendFile(clientPath)
    } catch (e) {
      logger.error(e, 'Socket.io client not found')
      return res.status(404).send('socket.io-client not installed')
    }
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
