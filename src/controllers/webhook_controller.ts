import { Request, Response } from 'express'
import { Outgoing } from '../services/outgoing'
import logger from '../services/logger'
import { UNOAPI_AUTH_TOKEN } from '../defaults'
import { getConfig } from '../services/config'

export class WebhookController {
  private service: Outgoing
  private getConfig: getConfig

  constructor(service: Outgoing, getConfig: getConfig) {
    this.service = service
    this.getConfig = getConfig
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

  public async whatsappVerify(req: Request, res: Response) {
    logger.debug('webhook whatsapp verify method %s', req.method)
    logger.debug('webhook whatsapp verify headers %s', JSON.stringify(req.headers))
    logger.debug('webhook whatsapp verify params %s', JSON.stringify(req.params))
    logger.debug('webhook whatsapp verify body %s', JSON.stringify(req.body))
    logger.debug('webhook whatsapp verify query %s', JSON.stringify(req.query))
    const { phone } = req.params

    const mode = req.query['hub.mode']
    const token = req.query['hub.verify_token']
    const challenge = req.query['hub.challenge']
    const config = (await this.getConfig(phone.replace('+', ''))) || { authToken: UNOAPI_AUTH_TOKEN }
  
    if (mode === 'subscribe' && token === config.authToken) {
      res.status(200).send(challenge)
    } else {
      res.sendStatus(403)
    }
  }
}
