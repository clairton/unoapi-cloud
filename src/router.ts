import { indexController } from './controllers/index_controller'
import { webhookController } from './controllers/webhook_controller'
import { TemplatesController } from './controllers/templates_controller'
import { MessagesController } from './controllers/messages_controller'
import { MediaController } from './controllers/media_controller'
import { Incoming } from './services/incoming'
import { getConfig } from './services/config'
import { Outgoing } from './services/outgoing'
import middleware from './services/middleware'
import injectRoute from './services/inject_route'
import { Request, Response, NextFunction, Router } from 'express'
import { ConnectionController } from './controllers/connection_controller'

export const router = (
  incoming: Incoming,
  outgoing: Outgoing,
  baseUrl: string,
  getConfig: getConfig,
  middleware: middleware = async (req: Request, res: Response, next: NextFunction) => next(),
  // eslint-disable-next-line @typescript-eslint/no-unused-vars, @typescript-eslint/no-empty-function
  injectRoute: injectRoute = async (router: Router) => {},
) => {
  const router: Router = Router()
  const messagesController = new MessagesController(incoming, outgoing)
  const mediaController = new MediaController(baseUrl, getConfig)
  const templatesController = new TemplatesController(getConfig)
  const connection_controller = new ConnectionController(incoming, outgoing)

  //Routes
  router.get('/ping', indexController.ping)
  router.get('/:version/:phone/message_templates', middleware, templatesController.index.bind(templatesController))
  router.post('/:version/:phone/messages', middleware, messagesController.index.bind(messagesController))
  router.get('/:version/:phone/:media_id', middleware, mediaController.index.bind(mediaController))
  router.get('/:version/download/:phone/:file', middleware, mediaController.download.bind(mediaController))
  router.post('/:version/create_client', middleware, connection_controller.create.bind(connection_controller))
  router.delete('/:version/:phone/disconnect', middleware, connection_controller.disconnect.bind(connection_controller))
  // router.get('/healthcheck', middleware)

  injectRoute(router)

  // Webhook for tests
  router.post('/webhooks/whatsapp/:phone', webhookController.whatsapp)
  return router
}
