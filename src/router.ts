import { Router } from 'express'
import { Incoming } from './services/incoming'
import { Outgoing } from './services/outgoing'
import { getConfig } from './services/config'
import middleware from './services/middleware'
import { SessionStore } from './services/session_store'
import injectRoute from './services/inject_route'
import injectRouteDummy from './services/inject_route_dummy'
import { indexController } from './controllers/index_controller'
import { WebhookController } from './controllers/webhook_controller'
import { ContactsController } from './controllers/contacts_controller'
import { TemplatesController } from './controllers/templates_controller'
import { MessagesController } from './controllers/messages_controller'
import { MediaController } from './controllers/media_controller'
import { PhoneNumberController } from './controllers/phone_number_controller'
import { RegistrationController } from './controllers/registration_controller'
import { SessionController } from './controllers/session_controller'
import { BlacklistController } from './controllers/blacklist_controller'
import { Server } from 'socket.io'
import { OnNewLogin } from './services/socket'
import { addToBlacklist } from './services/blacklist'
import { Reload } from './services/reload'
import { Logout } from './services/logout'
import { Contact } from './services/contact'
import { ContactDummy } from './services/contact_dummy'
import { middlewareNext } from './services/middleware_next'

export const router = (
  incoming: Incoming,
  outgoing: Outgoing,
  baseUrl: string,
  getConfig: getConfig,
  sessionStore: SessionStore,
  socket: Server,
  onNewLogin: OnNewLogin,
  addToBlacklist: addToBlacklist,
  reload: Reload,
  logout: Logout,
  middleware: middleware = middlewareNext,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars, @typescript-eslint/no-empty-function
  injectRoute: injectRoute = injectRouteDummy,
  contact: Contact = new ContactDummy(),
) => {
  const router: Router = Router()
  const messagesController = new MessagesController(incoming, outgoing)
  const mediaController = new MediaController(baseUrl, getConfig)
  const templatesController = new TemplatesController(getConfig)
  const registrationController = new RegistrationController(getConfig, reload, logout)
  const phoneNumberController = new PhoneNumberController(getConfig, sessionStore)
  const sessionController = new SessionController(getConfig, onNewLogin, socket)
  const webhookController = new WebhookController()
  const blacklistController = new BlacklistController(addToBlacklist)
  const contactsController = new ContactsController(contact)

  //Routes
  router.get('/', indexController.root)
  router.get('/index.html', indexController.root)
  router.get('/ping', indexController.ping)
  router.get('/:version/debug_token', indexController.debugToken)
  router.get('/sessions', middleware, phoneNumberController.list.bind(phoneNumberController))
  router.get('/sessions/:phone', sessionController.index.bind(sessionController))
  router.post('/:phone/contacts', middleware, contactsController.post.bind(contactsController))
  router.post('/:version/:phone/register', middleware, registrationController.register.bind(registrationController))
  router.post('/:version/:phone/deregister', middleware, registrationController.deregister.bind(registrationController))
  router.get('/:version/:phone', middleware, phoneNumberController.get.bind(phoneNumberController))
  // https://developers.facebook.com/docs/whatsapp/business-management-api/manage-phone-numbers/
  router.get('/:version/:phone/phone_numbers', middleware, phoneNumberController.list.bind(phoneNumberController))
  router.get('/:version/:phone/message_templates', middleware, templatesController.index.bind(templatesController))
  router.post('/:version/:phone/templates', middleware, templatesController.templates.bind(templatesController))
  router.post('/:version/:phone/messages', middleware, messagesController.index.bind(messagesController))
  router.get('/:version/:phone/:media_id', middleware, mediaController.index.bind(mediaController))
  router.get('/:version/download/:phone/:file', middleware, mediaController.download.bind(mediaController))
  router.post('/:phone/blacklist/:webhook_id', middleware, blacklistController.update.bind(blacklistController))

  injectRoute(router)

  // Webhook for tests
  router.post('/webhooks/whatsapp/:phone', webhookController.whatsapp)
  return router
}
