import { Request, Response } from 'express'
import { Config, getConfig } from '../services/config'
import { SessionStore, getSessionStatus } from '../services/session_store'
import logger from '../services/logger'

export class PhoneNumberController {
  private getConfig: getConfig
  private sessionStore: SessionStore

  constructor(getConfig: getConfig, sessionStore: SessionStore) {
    this.getConfig = getConfig
    this.sessionStore = sessionStore
  }

  public async get(req: Request, res: Response) {
    logger.debug('phone number get method %s', req.method)
    logger.debug('phone number get headers %s', JSON.stringify(req.headers))
    logger.debug('phone number get params %s', JSON.stringify(req.params))
    logger.debug('phone number get body %s', JSON.stringify(req.body))
    logger.debug('phone number get query', JSON.stringify(req.query))
    const { phone } = req.params
    try {
      const config: Config = await this.getConfig(phone)
      return res.status(200).json({
        display_phone_number: phone,
        status: getSessionStatus(phone),
        ...config,
      })
    } catch (e) {
      return res.status(500).json({ status: 'error', message: e.message })
    }
  }

  public async list(req: Request, res: Response) {
    logger.debug('phone number list method %s', req.method)
    logger.debug('phone number list headers %s', JSON.stringify(req.headers))
    logger.debug('phone number list params %s', JSON.stringify(req.params))
    logger.debug('phone number list body %s', JSON.stringify(req.body))
    logger.debug('phone number list query', JSON.stringify(req.query))
    try {
      const phones = await this.sessionStore.getPhones()
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const configs: any[] = []
      for (let i = 0, j = phones.length; i < j; i++) {
        const phone = phones[i]
        const config = await this.getConfig(phone)
        configs.push({ ...config, display_phone_number: phone, status: getSessionStatus(phone) })
      }
      return res.status(200).json(configs)
    } catch (e) {
      return res.status(500).json({ status: 'error', message: e.message })
    }
  }
}
