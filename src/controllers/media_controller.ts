import { Request, Response } from 'express'
import { DataStore } from '../services/data_store'
import { getDataStore } from '../services/data_store'
import { getMediaStore, MediaStore } from '../services/media_store'

export class MediaController {
  private baseUrl: string
  private getDataStore: getDataStore
  private getMediaStore: getMediaStore

  constructor(baseUrl: string, getMediaStore: getMediaStore, getDataStore: getDataStore) {
    this.baseUrl = baseUrl
    this.getDataStore = getDataStore
    this.getMediaStore = getMediaStore
  }

  public async index(req: Request, res: Response) {
    console.debug('media index headers', req.headers)
    console.debug('media index params', req.params)
    console.debug('media index body', JSON.stringify(req.body, null, ' '))
    const { media_id: mediaId, phone } = req.params
    if (mediaId) {
      const mediaStore: MediaStore = this.getMediaStore(phone, {}, this.getDataStore)
      const mediaResult = await mediaStore.getMedia(this.baseUrl, mediaId)
      return res.status(200).json(mediaResult)
    }
  }

  public async download(req: Request, res: Response) {
    console.debug('media download headers', req.headers)
    console.debug('media download params', req.params)
    console.debug('media download body', JSON.stringify(req.body, null, ' '))
    const { file, phone } = req.params
    const store: MediaStore = this.getMediaStore(phone, {}, this.getDataStore)
    store.downloadMedia(res, file)
  }
}
