import { Request, Response } from 'express'
import { DataStore } from '../services/data_store'
import { getFileName, getFilePath } from '../services/data_store_file'
import { proto } from '@adiwajshing/baileys'
import { getDataStore } from '../services/data_store'
import mime from 'mime-types'

export class MediaController {
  private baseUrl: string
  private getDataStore: getDataStore

  constructor(baseUrl: string, getDataStore: getDataStore) {
    this.baseUrl = baseUrl
    this.getDataStore = getDataStore
  }

  public async index(req: Request, res: Response) {
    console.debug('media index headers', req.headers)
    console.debug('media index params', req.params)
    console.debug('media index body', JSON.stringify(req.body, null, ' '))
    const { media_id: mediaId, phone } = req.params
    const store: DataStore = this.getDataStore(phone, {})
    if (mediaId) {
      const key: proto.IMessageKey | undefined = await store.loadKey(mediaId)
      console.debug('key %s for %s', key, mediaId)
      if (key) {
        const { remoteJid, id } = key
        if (remoteJid && id) {
          const message = await store.loadMessage(remoteJid, id)
          console.debug('message %s for %s', message, key)
          if (message) {
            const fileName = await getFileName(phone, message)
            const mimeType = mime.lookup(fileName)
            const url = `${this.baseUrl}/v15.0/download/${fileName}`
            const result = {
              messaging_product: 'whatsapp',
              url,
              file_name: fileName,
              mime_type: mimeType,
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

  public async download(req: Request, res: Response) {
    console.debug('media download headers', req.headers)
    console.debug('media download params', req.params)
    console.debug('media download body', JSON.stringify(req.body, null, ' '))
    const { file, phone } = req.params
    const fileName = getFilePath(`${phone}/${file}`)
    res.contentType(mime.lookup(fileName) || '')
    res.download(fileName)
  }
}
