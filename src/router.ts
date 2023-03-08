import { Router } from 'express'

import { indexController } from './controllers/index_controller'
import { webhookController } from './controllers/webhook_controller'
import { templatesController } from './controllers/templates_controller'
import { MessagesController } from './controllers/messages_controller'
import { MediaController } from './controllers/media_controller'
import { Incoming } from './services/incoming'
import { getDataStore } from './services/data_store'

export const router = (service: Incoming, baseUrl: string, getDataStore: getDataStore) => {
  const router: Router = Router()
  const messagesController = new MessagesController(service)
  const messages = messagesController.index.bind(messagesController)
  const mediaController = new MediaController(baseUrl, getDataStore)
  const index = mediaController.index.bind(mediaController)
  const download = mediaController.download.bind(mediaController)

  //Routes
  router.get('/ping', indexController.ping)
  router.get('/:version/:phone/message_templates', templatesController.index)
  router.post('/:version/:phone/messages', messages)
  router.get('/:version/:phone/:media_id', index)
  router.get('/:version/download/:phone/:file', download)

  // Webhook for tests
  router.post('/webhooks/whatsapp/:phone', webhookController.whatsapp)
  return router
}
