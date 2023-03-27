import { WAMessage } from '@adiwajshing/baileys'
import { Response } from 'express'
import { getDataStore } from './data_store'

export const mediaStores: Map<string, MediaStore> = new Map()

export interface getMediaStore {
  (phone: string, config: object, getDataStore: getDataStore): MediaStore
}

export type MediaStore = {
  getMedia: (baseUrl: string, mediaId: string) => Promise<object>
  saveMedia: (waMessage: WAMessage) => Promise<boolean>
  removeMedia: (fileName: string) => Promise<void>
  downloadMedia: (resp: Response, fileName: string) => Promise<void>
}
