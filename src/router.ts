import { Router } from 'express'

import { indexController } from './controllers/index_controller'

const router: Router = Router()

//Routes
router.get('/ping', indexController.ping)

export { router }
