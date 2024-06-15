import { Request, Response } from 'express'
import logger from '../services/logger'
import { addToBlacklist } from '../services/blacklist'

export class BlacklistController {
  private addToBlacklist: addToBlacklist

  constructor(addToBlacklist: addToBlacklist) {
    this.addToBlacklist = addToBlacklist
  }

  async update(req: Request, res: Response) {
    logger.debug('blacklist method %s', req.method)
    logger.debug('blacklist headers %s', JSON.stringify(req.headers))
    logger.debug('blacklist params %s', JSON.stringify(req.params))
    logger.debug('blacklist body %s', JSON.stringify(req.body))
    const { to, ttl } = req.body
    if (!to) {
      return res.status(400).send(`{"error": "to param is required"}`)
    }
    const { webhook_id, phone } = req.params
    await this.addToBlacklist(phone, webhook_id, to, ttl)
    res.status(200).send(`{"success": true}`)
  }
}
