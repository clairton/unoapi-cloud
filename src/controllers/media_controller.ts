import { Request, Response } from 'express'
import { DataStore } from '../services/data_store'
import { getFileName, getFilePath } from '../services/file_data_store'
import { proto } from '@adiwajshing/baileys'
import { getDataStore } from '../services/get_data_store'

export class MediaController {
  private baseUrl: string
  private getDataStore: getDataStore

  constructor(baseUrl: string, getDataStore: getDataStore) {
    this.baseUrl = baseUrl
    this.getDataStore = getDataStore
  }

  public async index(req: Request, res: Response) {
    const { media_id: mediaId, phone } = req.params
    const store: DataStore = this.getDataStore(phone, {})
    if (mediaId) {
      const key: proto.IMessageKey | undefined = await store.loadKey(mediaId)
      if (key) {
        const { remoteJid, id } = key
        if (remoteJid && id) {
          const message = await store.loadMessage(remoteJid, id)
          if (message) {
            const fileName = await getFileName(message)
            const url = `${this.baseUrl}/v15.0/${fileName}`
            const result = {
              messaging_product: 'whatsapp',
              url,
              file_name: fileName,
              // mime_type: mimetype,
              // sha256: binMessage.fileSha256,
              // file_size: binMessage.fileLength,
              id: `${phone}/${id}`,
            }
            return res.status(200).json(result)
          }
        }
      }
    }
  }

  public async media(req: Request, res: Response) {
    const { media_id: mediaId, phone, extension } = req.params
    if (mediaId && extension) {
      const fileName = await getFilePath(phone, `${mediaId}.${extension}`)
      res.download(fileName)
    }
  }
}
