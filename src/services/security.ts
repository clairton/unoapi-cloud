import { UNOAPI_HEADER_NAME, UNOAPI_AUTH_TOKEN } from '../defaults'
import { getConfig } from './redis'
import middleware from './middleware'
import { Request, Response, NextFunction } from 'express'
import logger from './logger'

const security = async (req: Request, res: Response, next: NextFunction) => {
  const { phone } = req.params
  logger.debug('Verifing client authentication...')
  if (UNOAPI_AUTH_TOKEN) {
    const httpAuthToken = getAuthHeaderToken(req)
    if (!httpAuthToken) {
      const message = `Please set Header ${UNOAPI_HEADER_NAME} query params or Authorization header`
      logger.warn(message)
      res.status(401).json({
        error: {
          code: 0,
          title: message,
        },
      })
    } else {
      logger.debug(`Retrieved http token ${httpAuthToken}`)
      const config = (await getConfig(phone)) || { authToken: UNOAPI_AUTH_TOKEN }
      logger.debug(`Retrieved auth token ${httpAuthToken}`)
      if (httpAuthToken.trim() != config.authToken.trim() && httpAuthToken.trim() != UNOAPI_AUTH_TOKEN) {
        const message = `Invalid token value ${httpAuthToken}`
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

const getAuthHeaderToken = (req: Request) => {
  const headerName = UNOAPI_HEADER_NAME
  return (
    req.headers[headerName] ||
    req.headers['authorization'] ||
    req.query['access_token'] ||
    req.headers['Authorization'] ||
    req.body['auth_token'] ||
    ''
  ).replace('Bearer ', '')
}

export default security as middleware
