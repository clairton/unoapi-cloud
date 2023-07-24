import { Request, Response } from 'express'
import { getConfig } from '../services/config'
import logger from '../services/logger'

export class MediaController {
  private baseUrl: string
  private getConfig: getConfig

  constructor(baseUrl: string, getConfig: getConfig) {
    this.baseUrl = baseUrl
    this.getConfig = getConfig
  }

  public async index(req: Request, res: Response) {
    logger.debug('media index method', req.method)
    logger.debug('media index headers', req.headers)
    logger.debug('media index params', req.params)
    logger.debug('media index body', JSON.stringify(req.body, null, ' '))
    const { media_id: mediaId, phone } = req.params
    if (mediaId) {
      const config = await this.getConfig(phone)
      const store = await config.getStore(phone, config)
      const mediaResult = await store.mediaStore.getMedia(this.baseUrl, mediaId)
      return res.status(200).json(mediaResult)
    }
  }

  public async download(req: Request, res: Response) {
    logger.debug('media download method', req.method)
    logger.debug('media download headers', req.headers)
    logger.debug('media download params', req.params)
    logger.debug('media download body', JSON.stringify(req.body, null, ' '))
    const { file, phone } = req.params
    const config = await this.getConfig(phone)
    const store = await config.getStore(phone, config)
    store.mediaStore.downloadMedia(res, file)
  }
}
