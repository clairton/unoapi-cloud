import logger from './logger'
import { Sync } from './sync'

export class SyncDummy implements Sync {
  async process(_phone, _jids: string[], _force: boolean) {
    logger.debug('Ignore sync')
    return true
  }
}
