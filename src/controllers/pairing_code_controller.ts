import { Request, Response } from 'express'
import { getConfig } from '../services/config'
import logger from '../services/logger'
import { Incoming } from '../services/incoming'

export class PairingCodeController {
  private service: Incoming
  private getConfig: getConfig

  constructor(getConfig: getConfig, service: Incoming) {
    this.getConfig = getConfig
    this.service = service
  }

  public async request(req: Request, res: Response) {
    logger.debug('pairing code post headers %s', JSON.stringify(req.headers))
    logger.debug('pairing code post params %s', JSON.stringify(req.params))
    logger.debug('pairing code post body %s', JSON.stringify(req.body))
    const { phone } = req.params
    const config = await this.getConfig(phone)
    config.connectionType = 'pairing_code'
    try {
      const message = {
        messaging_product: 'whatsapp',
        to: phone,
        type: 'text',
        text: {
          body: 'Request Pairing code'
        } 
      }
      this.service.send(phone, message, {})
      return res.status(200).json({ success: true })
    } catch (e) {
      return res.status(500).json({ status: 'error', message: e.message })
    }
  }
}
