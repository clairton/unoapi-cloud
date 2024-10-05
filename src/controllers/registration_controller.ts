import { Request, Response } from 'express'
import { getConfig } from '../services/config'
import { setConfig } from '../services/redis'
import logger from '../services/logger'
import { Logout } from '../services/logout'
import { Reload } from '../services/reload'

export class RegistrationController {
  private getConfig: getConfig
  private logout: Logout
  private reload: Reload

  constructor(getConfig: getConfig, reload: Reload, logout: Logout) {
    this.getConfig = getConfig
    this.reload = reload
    this.logout = logout
  }

  public async register(req: Request, res: Response) {
    logger.debug('register method %s', req.method)
    logger.debug('register headers %s', JSON.stringify(req.headers))
    logger.debug('register params %s', JSON.stringify(req.params))
    logger.debug('register body %s', JSON.stringify(req.body))
    logger.debug('register query %s', JSON.stringify(req.query))
    const { phone } = req.params
    try {
      await setConfig(phone, req.body)
      await this.reload.run(phone)
      const config = await this.getConfig(phone)
      return res.status(200).json(config)
    } catch (e) {
      return res.status(400).json({ status: 'error', message: `${phone} could not create, error: ${e.message}` })
    }
  }

  public async deregister(req: Request, res: Response) {
    logger.debug('deregister method %s', req.method)
    logger.debug('deregister headers %s', JSON.stringify(req.headers))
    logger.debug('deregister params %s', JSON.stringify(req.params))
    logger.debug('deregister body %s', JSON.stringify(req.body))
    logger.debug('deregister query %s', JSON.stringify(req.query))
    const { phone } = req.params
    await this.logout.run(phone)
    return res.status(204).send()
  }
}
