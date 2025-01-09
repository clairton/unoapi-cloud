import { Contact, proto, WAMessage } from 'baileys'
import { Response } from 'express'
import { getDataStore } from './data_store'
import { Config } from './config'

export const mediaStores: Map<string, MediaStore> = new Map()

export interface getMediaStore {
  (phone: string, config: Config, getDataStore: getDataStore): MediaStore
}

export type MediaStore = {
  type: string
  getMedia: (baseUrl: string, mediaId: string) => Promise<object | void>
  saveMedia: (waMessage: WAMessage) => Promise<WAMessage>
  saveMediaBuffer: (fileName: string, buffer: Buffer) => Promise<boolean>
  removeMedia: (fileName: string) => Promise<void>
  downloadMedia: (resp: Response, fileName: string) => Promise<void>
  getFileName: (phone: string, waMessage: proto.IWebMessageInfo) => string
  getFileUrl: (fileName: string, expiresIn: number) => Promise<string>
  getDownloadUrl: (baseUrl: string, fileName: string) => Promise<string>
  getProfilePictureUrl: (baseUrl: string, phoneNumber: string) => Promise<string | undefined>
  saveProfilePicture: (contact: Partial<Contact>) => Promise<void>
}
