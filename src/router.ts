import { Router } from 'express'

import { indexController } from './controllers/index_controller'
import { webhookController } from './controllers/webhook_controller'

const router: Router = Router()

//Routes
router.get('/ping', indexController.ping)

// Webhook for tests
router.post('/webhooks/whatsapp/:phone', webhookController.whatsapp)

export { router }
