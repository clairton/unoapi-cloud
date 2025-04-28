import { clients } from '../services/client'
import { configs } from '../services/config'
import { dataStores } from './data_store'
import logger from './logger'
import { mediaStores } from './media_store'
import { stores } from './store'

export class Reload {
  async run(phone: string, _params = { force: false }) {
    logger.debug('Reload memory run for phone %s', phone)
    clients.delete(phone)
    stores.delete(phone)
    dataStores.delete(phone)
    mediaStores.delete(phone)
    configs.delete(phone)
  }
}
