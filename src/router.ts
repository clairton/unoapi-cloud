import { Router } from 'express'

import { indexController } from './controllers/index_controller'
import { webhookController } from './controllers/webhook_controller'
import { MessagesController } from './controllers/messages_controller'
import { Incoming } from './services/incoming'

export const router = (service: Incoming) => {
  const router: Router = Router()
  const messagesController = new MessagesController(service)
  const messages = messagesController.index.bind(messagesController)

  //Routes
  router.get('/ping', indexController.ping)
  router.post('/:version/:phone/messages', messages)

  // Webhook for tests
  router.post('/webhooks/whatsapp/:phone', webhookController.whatsapp)
  return router
}
