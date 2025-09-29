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
    logger.debug('media index method %s', req.method)
    logger.debug('media index headers %s', JSON.stringify(req.headers))
    logger.debug('media index params %s', JSON.stringify(req.params))
    logger.debug('media index body %s', JSON.stringify(req.body))
    const { phone, media_id: mediaId } = req.params
    const config = await this.getConfig(phone)
    const store = await config.getStore(phone, config)
    const { mediaStore } = store
    const mediaResult = await mediaStore.getMedia(this.baseUrl, mediaId)
    if (mediaResult) {
      logger.debug('media index response %s', JSON.stringify(mediaResult))
      return res.status(200).json(mediaResult)
    } else {
      logger.warn('media index response 404', mediaId)
      return res.sendStatus(404)
    }
  }

  public async download(req: Request, res: Response) {
    logger.debug('media download method %s', req.method)
    logger.debug('media download headers %s', JSON.stringify(req.headers))
    logger.debug('media download params %s', JSON.stringify(req.params))
    logger.debug('media download body %s', JSON.stringify(req.body))
    const { phone, file } = req.params
    const config = await this.getConfig(phone)
    const store = await config.getStore(phone, config)
    const { mediaStore } = store
    return mediaStore.downloadMedia(res, `${phone}/${file}`)
  }
}
