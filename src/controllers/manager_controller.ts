import { Request, Response } from 'express'
import fs from 'fs'
import logger from '../services/logger'
import { clients } from '../services/client_baileys'

const packageJson = JSON.parse(fs.readFileSync('./package.json', 'utf8'))

export class ManagerController {
  public async info(req: Request, res: Response) {
    logger.debug('manager info method %s', req.method)
    logger.debug('manager info headers %s', JSON.stringify(req.headers))
    logger.debug('manager info params %s', JSON.stringify(req.params))
    logger.debug('manager info body %s', JSON.stringify(req.body))
    logger.debug('manager info query', JSON.stringify(req.query))
    try {
      return res.status(200).json({
        message: 'Welcome to the UnoAPI Manager!',
        version: packageJson.version,
        documentation: `${req.protocol}://${req.get('host')}/docs`,
        manager: `${req.protocol}://${req.get('host')}/manager`,
      })
    } catch (e) {
      return res.status(500).json({ status: 'error', message: e.message })
    }
  }

  public async list(req: Request, res: Response) {
    logger.debug('info method %s', req.method)
    logger.debug('info headers %s', JSON.stringify(req.headers))
    logger.debug('info params %s', JSON.stringify(req.params))
    logger.debug('info body %s', JSON.stringify(req.body))
    logger.debug('info query', JSON.stringify(req.query))
    try {
      const keys = Object.keys(clients)
      return res.status(200).json({
        keys,
      })
    } catch (e) {
      return res.status(500).json({ status: 'error', message: e.message })
    }
  }
}
