import { Request, Response, NextFunction, Router } from 'express'

import { Incoming } from './services/incoming'
import { Outgoing } from './services/outgoing'

import { getConfig } from './services/config'
import { getClient } from './services/client'

import middleware from './services/middleware'
import injectRoute from './services/inject_route'

import { indexController } from './controllers/index_controller'
import { webhookController } from './controllers/webhook_controller'
import { TemplatesController } from './controllers/templates_controller'
import { MessagesController } from './controllers/messages_controller'
import { MediaController } from './controllers/media_controller'
import { SessionController } from './controllers/session_controller'

export const router = (
  incoming: Incoming,
  outgoing: Outgoing,
  baseUrl: string,
  getConfig: getConfig,
  getClient: getClient,
  middleware: middleware = async (req: Request, res: Response, next: NextFunction) => next(),
  // eslint-disable-next-line @typescript-eslint/no-unused-vars, @typescript-eslint/no-empty-function
  injectRoute: injectRoute = async (router: Router) => {},
) => {
  const router: Router = Router()
  const messagesController = new MessagesController(incoming, outgoing)
  const mediaController = new MediaController(baseUrl, getConfig)
  const templatesController = new TemplatesController(getConfig)
  const sessionController = new SessionController(incoming, outgoing, getConfig, getClient)

  //Routes
  router.get('/ping', indexController.ping)
  router.get('/:version/debug_token', indexController.debugToken)
  router.get('/:version/:phone', indexController.getPhoneNumber)
  router.get('/:phone/session', middleware, sessionController.info.bind(sessionController))
  router.post('/:phone/session', middleware, sessionController.create.bind(sessionController))
  router.delete('/:phone/session', middleware, sessionController.delete.bind(sessionController))
  router.get('/:version/:phone/message_templates', middleware, templatesController.index.bind(templatesController))
  router.post('/:version/:phone/messages', middleware, messagesController.index.bind(messagesController))
  router.get('/:version/:phone/:media_id', middleware, mediaController.index.bind(mediaController))
  router.get('/:version/download/:phone/:file', middleware, mediaController.download.bind(mediaController))

  injectRoute(router)

  // Webhook for tests
  router.post('/webhooks/whatsapp/:phone', webhookController.whatsapp)
  return router
}
