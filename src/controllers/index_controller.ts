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

  public getPhoneNumber(req: Request, res: Response) {
    logger.debug('get phone number method %s', JSON.stringify(req.method))
    logger.debug('get phone number headers %s', JSON.stringify(req.headers))
    logger.debug('get phone number params %s', JSON.stringify(req.params))
    logger.debug('get phone number query %s', JSON.stringify(req.query))
    logger.debug('get phone number body %s', JSON.stringify(req.body))
    res.set('Content-Type', 'application/json')
    const { phone } = req.params
    return res.status(200).send({
      display_phone_number: phone,
    })
  }
}

export const indexController = new IndexController()
