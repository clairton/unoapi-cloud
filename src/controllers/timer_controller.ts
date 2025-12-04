import { Request, Response } from 'express'
import logger from '../services/logger'
import { start, stop } from '../services/timer'

export class TimerController {
  async stop(req: Request, res: Response) {
    const { phone, to } = req.params
    logger.debug('timer phone %s stop method %s', phone, req.method)
    logger.debug('timer phone %s stop headers %s', phone, JSON.stringify(req.headers))
    logger.debug('timer phone %s stop params %s', phone, JSON.stringify(req.params))
    logger.debug('timer phone %s stop body %s', phone, JSON.stringify(req.body))
    await stop(phone, to)
    res.status(200).send(`{"success": true}`)
  }

  async start(req: Request, res: Response) {
    const { phone, to } = req.params
    logger.debug('timer phone %s start method %s', phone, req.method)
    logger.debug('timer phone %s headers %s', phone, JSON.stringify(req.headers))
    logger.debug('timer phone %s params %s', phone, JSON.stringify(req.params))
    logger.debug('timer phone %s body %s', phone, JSON.stringify(req.body))
    const message = req.body.message || req.query.message
    const type = req.body.type || req.query.type || 'text'
    if (!message) {
      logger.info('timer start error: message param is required')
      return res.status(400).send(`{"error": "message param is required"}`)
    }
    const timeout = req.body.timeout || req.query.timeout
    if (!timeout) {
      logger.warn('timer start error: timeout param is required')
      return res.status(400).send(`{"error": "timeout param is required"}`)
    }
    const nexts = req.body.nexts || req.query.nexts || []
    await start(phone, to, timeout, message, type, nexts)
    res.status(200).send(`{"success": true}`)
  }
}
