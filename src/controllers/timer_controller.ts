import { Request, Response } from 'express'
import logger from '../services/logger'
import { start, stop } from '../services/timer'

export class TimerController {
  async stop(req: Request, res: Response) {
    logger.debug('timer stop method %s', req.method)
    logger.debug('timer stop  headers %s', JSON.stringify(req.headers))
    logger.debug('timer stop  params %s', JSON.stringify(req.params))
    logger.debug('timer stop  body %s', JSON.stringify(req.body))
    const { phone, to } = req.params
    await stop(phone, to)
    res.status(200).send(`{"success": true}`)
  }

  async start(req: Request, res: Response) {
    logger.debug('timer start method %s', req.method)
    logger.debug('timer start  headers %s', JSON.stringify(req.headers))
    logger.debug('timer start  params %s', JSON.stringify(req.params))
    logger.debug('timer start  body %s', JSON.stringify(req.body))
    const { phone, to } = req.params
    const message = req.body.message || req.query.message
    if (!message) {
      logger.info('timer start error: message param is required')
      return res.status(400).send(`{"error": "message param is required"}`)
    }
    const timeout = req.body.timeout || req.query.timeout
    if (!timeout) {
      logger.warn('timer start error: timeout param is required')
      return res.status(400).send(`{"error": "timeout param is required"}`)
    }
    const id = await start(phone, to, timeout, message)
    res.status(200).send(`{"success": true}`)
  }
}
