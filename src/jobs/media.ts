import { getConfig } from '../services/config'
import logger from '../services/logger'

export class MediaJob {
  private getConfig: getConfig

  constructor(getConfig: getConfig) {
    this.getConfig = getConfig
  }

  async consume(data: object) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const a = data as any
    const phone: string = a.phone
    const fileName: string = a.fileName
    const config = await this.getConfig(phone)
    const { mediaStore } = await config.getStore(phone, config)
    logger.debug('Removing file %s...', fileName)
    await mediaStore.removeMedia(fileName)
    logger.debug('Remove file %s!', fileName)
  }
}
