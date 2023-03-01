import { Router } from 'express'

import { indexController } from './controllers/index_controller'
import { webhookController } from './controllers/webhook_controller'
import { MessagesController } from './controllers/messages_controller'
import { MediaController } from './controllers/media_controller'
import { Incoming } from './services/incoming'
import { getDataStore } from './services/get_data_store'

export const router = (service: Incoming, baseUrl: string, getDataStore: getDataStore) => {
  const router: Router = Router()
  const messagesController = new MessagesController(service)
  const messages = messagesController.index.bind(messagesController)
  const mediaController = new MediaController(baseUrl, getDataStore)
  const index = mediaController.index.bind(mediaController)
  const media = mediaController.media.bind(mediaController)

  //Routes
  router.get('/ping', indexController.ping)
  router.post('/:version/:phone/messages', messages)
  router.get('/:version/:phone/:media_id', index)
  router.get('/:version/:phone/:media_id.{:extension}', media)

  // Webhook for tests
  router.post('/webhooks/whatsapp/:phone', webhookController.whatsapp)
  return router
}
