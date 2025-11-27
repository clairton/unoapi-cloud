import { UNOAPI_HEADER_NAME, UNOAPI_AUTH_TOKEN } from '../defaults'
import { Request, Response, NextFunction } from 'express'
import logger from './logger'
import { SessionStore } from './session_store'

export default class Security {
  private sessionStore: SessionStore

  constructor(sessionStore: SessionStore) {
    this.sessionStore = sessionStore
  }

  public async run(req: Request, res: Response, next: NextFunction) {
    const phone = req.params.phone || '*'
    logger.debug('Verifing client authentication...')
    if (UNOAPI_AUTH_TOKEN) {
      const httpAuthToken = `${getAuthHeaderToken(req).trim()}`
      if (!httpAuthToken) {
        const message = `Please set Header ${UNOAPI_HEADER_NAME} query params or Authorization header`
        logger.warn(message)
        logger.debug('method %s', req.method)
        logger.debug('headers %s', JSON.stringify(req.headers))
        logger.debug('params %s', JSON.stringify(req.params))
        logger.debug('body %s', JSON.stringify(req.body))
        logger.debug('query %s', JSON.stringify(req.query))
        res.status(401).json({
          error: {
            code: 0,
            title: message,
          },
        })
      } else {
        logger.debug(`Retrieved http token ${httpAuthToken}`)
        const tokens = await this.sessionStore.getTokens(phone)
        logger.debug(`Retrieved auth token ${httpAuthToken}`)
        const allTokens = [UNOAPI_AUTH_TOKEN, ...tokens]
        if (!allTokens.includes(httpAuthToken)) {
          const message = `Invalid token value ${httpAuthToken} for phone ${phone}`
          logger.debug('method %s', req.method)
          logger.debug('headers %s', JSON.stringify(req.headers))
          logger.debug('params %s', JSON.stringify(req.params))
          logger.debug('body %s', JSON.stringify(req.body))
          logger.debug('query %s', JSON.stringify(req.query))
          logger.warn(message)
          res.status(403).json({
            error: {
              code: 10,
              title: message,
            },
          })
        } else {
          logger.debug('Authenticated!')
          next()
        }
      }
    } else {
      next()
    }
  }
}

export const getAuthHeaderToken = (req: Request) => {
  const headerName = UNOAPI_HEADER_NAME
  return (
    req.headers[headerName] ||
    req.headers['authorization'] ||
    req.query['access_token'] ||
    req.query['hub.verify_token'] ||
    req.headers['Authorization'] ||
    req.body['auth_token'] ||
    req.body['authToken'] ||
    ''
  ).replace('Bearer ', '')
}
