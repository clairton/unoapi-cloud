import { Request, Response, NextFunction, Router } from 'express'
import { Incoming } from './services/incoming'
import { Outgoing } from './services/outgoing'
import { getConfig } from './services/config'
import middleware from './services/middleware'
import { SessionStore } from './services/session_store'
import injectRoute from './services/inject_route'
import { indexController } from './controllers/index_controller'
import { webhookController } from './controllers/webhook_controller'
import { TemplatesController } from './controllers/templates_controller'
import { MessagesController } from './controllers/messages_controller'
import { MediaController } from './controllers/media_controller'
import { PhoneNumberController } from './controllers/phone_number_controller'
import { RegistrationController } from './controllers/registration_controller'
import { SessionController } from './controllers/session_controller'
import { Server } from 'socket.io'
import { OnNewLogin } from './services/socket'

export const router = (
  incoming: Incoming,
  outgoing: Outgoing,
  baseUrl: string,
  getConfig: getConfig,
  sessionStore: SessionStore,
  socket: Server,
  onNewLogin: OnNewLogin,
  middleware: middleware = async (req: Request, res: Response, next: NextFunction) => next(),
  // eslint-disable-next-line @typescript-eslint/no-unused-vars, @typescript-eslint/no-empty-function
  injectRoute: injectRoute = async (router: Router) => {},
) => {
  const router: Router = Router()
  const messagesController = new MessagesController(incoming, outgoing)
  const mediaController = new MediaController(baseUrl, getConfig)
  const templatesController = new TemplatesController(getConfig)
  const registrationController = new RegistrationController(getConfig)
  const phoneNumberController = new PhoneNumberController(getConfig, sessionStore)
  const sessionController = new SessionController(getConfig, onNewLogin, socket)

  //Routes
  router.get('/ping', indexController.ping)
  router.get('/:version/debug_token', indexController.debugToken)
  router.get('/session/:phone', sessionController.index.bind(sessionController))
  router.post('/:version/:phone/register', middleware, registrationController.register.bind(registrationController))
  router.post('/:version/:phone/deregister', middleware, registrationController.deregister.bind(registrationController))
  router.get('/:version/:phone', middleware, phoneNumberController.get.bind(phoneNumberController))
  router.get('/:version/:phone/phone_numbers', middleware, phoneNumberController.list.bind(phoneNumberController))
  router.get('/:version/:phone/message_templates', middleware, templatesController.index.bind(templatesController))
  router.post('/:version/:phone/template', middleware, templatesController.templates.bind(templatesController))
  router.post('/:version/:phone/messages', middleware, messagesController.index.bind(messagesController))
  router.get('/:version/:phone/:media_id', middleware, mediaController.index.bind(mediaController))
  router.get('/:version/download/:phone/:file', middleware, mediaController.download.bind(mediaController))

  injectRoute(router)

  // Webhook for tests
  router.post('/webhooks/whatsapp/:phone', webhookController.whatsapp)
  return router
}
