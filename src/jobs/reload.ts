import logger from '../services/logger'
import { Reload } from '../services/reload'

export class ReloadJob {
  private reload: Reload

  constructor(reload: Reload) {
    this.reload = reload
  }

  async consume(_: string, { phone }: { phone: string }) {
    logger.debug('Reload job run for phone %s', phone)
    await this.reload.run(phone)
  }
}
