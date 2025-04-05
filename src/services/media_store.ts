import { Contact, proto, WAMessage } from 'baileys'
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
  getFileNameForwarder: <T>(phone: string, message: T) => string
  saveMediaBuffer: (fileName: string, buffer: Buffer) => Promise<boolean>
  removeMedia: (fileName: string) => Promise<void>
  downloadMedia: (resp: Response, fileName: string) => Promise<void>
  downloadMediaStream: (fileName: string) => Promise<Readable | undefined>
  getFileName: (phone: string, waMessage: proto.IWebMessageInfo) => string
  getFileUrl: (fileName: string, expiresIn: number) => Promise<string>
  getDownloadUrl: (baseUrl: string, fileName: string) => Promise<string>
  getProfilePictureUrl: (baseUrl: string, jid: string) => Promise<string | undefined>
  saveProfilePicture: (contact: Partial<Contact>) => Promise<void>
}
