import { Contact, proto, WAMessage } from '@whiskeysockets/baileys'
import { Response } from 'express'
import { getDataStore } from './data_store'
import { Config } from './config'
import { Readable } from 'stream'

export const mediaStores: Map<string, MediaStore> = new Map()

export interface getMediaStore {
  (phone: string, config: Config, getDataStore: getDataStore): MediaStore
}

export type MediaStore = {
  type: string
  getMedia: (baseUrl: string, mediaId: string) => Promise<object | void>
  saveMedia: (waMessage: WAMessage) => Promise<WAMessage>
  saveMediaForwarder: <T>(message: T) => Promise<T>
  saveMediaBuffer: (fileName: string, buffer: Buffer) => Promise<boolean>
  removeMedia: (fileName: string) => Promise<void>
  downloadMedia: (resp: Response, fileName: string) => Promise<void>
  downloadMediaStream: (fileName: string) => Promise<Readable | undefined>
  getFilePath: (phone: string, mediaId: string, mimeType: string) => string
  getFileUrl: (filePath: string, expiresIn: number) => Promise<string>
  getDownloadUrl: (baseUrl: string, fileName: string) => Promise<string>
  getProfilePictureUrl: (baseUrl: string, jid: string) => Promise<string | undefined>
  saveProfilePicture: (contact: Partial<Contact>) => Promise<void>
}
