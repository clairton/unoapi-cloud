import { proto, WAMessage } from '@whiskeysockets/baileys'
import { Response } from 'express'
import { getDataStore } from './data_store'
import { Config } from './config'

export const mediaStores: Map<string, MediaStore> = new Map()

export interface getMediaStore {
  (phone: string, config: Config, getDataStore: getDataStore): MediaStore
}

export type MediaStore = {
  getMedia: (baseUrl: string, mediaId: string) => Promise<object | void>
  saveMedia: (waMessage: WAMessage) => Promise<WAMessage>
  saveMediaBuffer: (fileName: string, buffer: Buffer) => Promise<boolean>
  removeMedia: (fileName: string) => Promise<void>
  downloadMedia: (resp: Response, fileName: string) => Promise<void>
  getFileName: (phone: string, waMessage: proto.IWebMessageInfo) => string
  getFileUrl: (fileName: string) => Promise<string>
  getDownloadUrl: (baseUrl: string, fileName: string) => Promise<string>
}
