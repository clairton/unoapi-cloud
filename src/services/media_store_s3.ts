import { proto, WAMessage, downloadMediaMessage, Contact } from 'baileys'
import { getBinMessage, toBuffer } from './transformer'
import { UNOAPI_JOB_MEDIA, DATA_TTL, FETCH_TIMEOUT_MS, DATA_PROFILE_TTL } from '../defaults'
import { mediaStores, MediaStore, getMediaStore } from './media_store'
import { Response } from 'express'
import { getDataStore } from './data_store'
import { PutObjectCommand, GetObjectCommand, DeleteObjectCommand, S3Client } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
import { amqpEnqueue } from '../amqp'
import type { Readable } from 'stream'
import { STORAGE_OPTIONS } from '../defaults'
import { mediaStoreFile } from './media_store_file'
import mime from 'mime-types'
import { Config } from './config'
import logger from './logger'
import fetch, { Response as FetchResponse } from 'node-fetch'


export const getMediaStoreS3: getMediaStore = (phone: string, config: Config, getDataStore: getDataStore): MediaStore => {
  if (!mediaStores.has(phone)) {
    logger.debug('Creating s3 data store %s', phone)
    const store = mediaStoreS3(phone, config, getDataStore)
    mediaStores.set(phone, store)
  } else {
    logger.debug('Retrieving s3 data store %s', phone)
  }
  return mediaStores.get(phone) as MediaStore
}
export const mediaStoreS3 = (phone: string, config: Config, getDataStore: getDataStore): MediaStore => {
  const PROFILE_PICTURE_FOLDER = 'profile-pictures'
  const profilePictureFileName = (phone) => `${phone}.jpg`
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const s3Config = STORAGE_OPTIONS((config as any).storage)
  const bucket = s3Config.bucket
  const s3Client = new S3Client(s3Config)

  const mediaStore = mediaStoreFile(phone, config, getDataStore)
  const getMedia = mediaStore.getMedia
  const getDownloadUrl = mediaStore.getDownloadUrl

  const saveMedia = async (waMessage: WAMessage) => {
    let buffer
    const binMessage = getBinMessage(waMessage)
    const localUrl = binMessage?.message?.url
    if (localUrl.indexOf('base64') >= 0) {
      const parts = localUrl.split(',')
      const base64 = parts[1]
      buffer = Buffer.from(base64, 'base64')
    } else {
      buffer = await downloadMediaMessage(waMessage, 'buffer', {})
    }
    const fileName = mediaStore.getFileName(phone, waMessage)
    await saveMediaBuffer(fileName, buffer)
    return waMessage
  }
  mediaStore.saveMedia = saveMedia

  const saveMediaBuffer = async (fileName: string, content: Buffer) => {
    logger.debug(`Uploading file ${fileName} to bucket ${bucket}....`)
    const putParams = {
      Bucket: bucket,
      Key: fileName,
      Body: content,
    }
    const abortSignal = AbortSignal.timeout(s3Config.timeoutMs)
    await s3Client.send(new PutObjectCommand(putParams), { abortSignal })
    logger.debug(`Uploaded file ${fileName} to bucket ${bucket}!`)
    await amqpEnqueue(UNOAPI_JOB_MEDIA, phone, { fileName: fileName }, { delay: DATA_TTL * 1000 })
    return true
  }
  mediaStore.saveMediaBuffer = saveMediaBuffer

  const getFileUrl = async (fileName: string, expiresIn = DATA_TTL) => {
    const getParams = {
      Bucket: bucket,
      Key: fileName,
    }
    const command = new GetObjectCommand(getParams)
    const link = await getSignedUrl(s3Client, command, { expiresIn })
    return link
  }
  mediaStore.getFileUrl = getFileUrl

  const removeMedia = async (fileName: string) => {
    const putParams = {
      Bucket: bucket,
      Key: fileName,
    }
    await s3Client.send(new DeleteObjectCommand(putParams))
  }
  mediaStore.removeMedia = removeMedia

  const downloadMedia = async (res: Response, file: string) => {
    const store = await getDataStore(phone, config)
    const mediaId = file.split('.')[0]
    if (mediaId) {
      const key: proto.IMessageKey | undefined = await store.loadKey(mediaId)
      logger.debug('key %s for %s', JSON.stringify(key), mediaId)
      if (key) {
        const { remoteJid, id } = key
        if (remoteJid && id) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const message: any = await store.loadMessage(remoteJid, id)
          logger.debug('message %s for %s', JSON.stringify(message), JSON.stringify(key))
          if (message) {
            const binMessage = getBinMessage(message)
            const fileNameS3 = mediaStore.getFileName(phone, message as WAMessage)
            const fileName = binMessage?.message?.fileName || fileNameS3
            const params = {
              Bucket: bucket,
              Key: fileNameS3,
            }
            logger.debug(`Downloading media ${fileName}...`)
            const response = await s3Client.send(new GetObjectCommand(params))
            const stream = response.Body as Readable
            const contentType = mime.lookup(fileNameS3)
            logger.debug('fileNameS3 %s contentType %s', fileNameS3, contentType)
            if (contentType) {
              res.contentType(contentType)
            }
            res.setHeader('Content-disposition', `attachment; filename="${encodeURIComponent(fileName)}"`)
            stream.pipe(res)
          } else {
            logger.error('Not retrieve the media: %', file)
            res.sendStatus(404)
          }
        }
      }
    }
  }
  mediaStore.downloadMedia = downloadMedia
  const getProfilePictureUrl = async (_baseUrl: string, phoneNumber: string) => {
    const fileName = `${phone}/${PROFILE_PICTURE_FOLDER}/${profilePictureFileName(phoneNumber)}`
    try {
      return getFileUrl(fileName, DATA_PROFILE_TTL)
    } catch (error) {
      if (error.name === 'NotFound' || error.code === 'NotFound') {
        return ''
      } else {
        throw error
      }
    }
  }
  mediaStore.getProfilePictureUrl = getProfilePictureUrl
  const saveProfilePicture = async (contact: Partial<Contact>) => {
    const fileName = `${phone}/${PROFILE_PICTURE_FOLDER}/${profilePictureFileName(contact.id)}`
    if (contact.imgUrl == 'changed') {
      logger.debug('Removing profile picture s3 %s...', contact.id)
      await removeMedia(fileName)
    } else if (contact.imgUrl) {
      logger.debug('Saving profile picture s3 %s...', contact.id)
      const response: FetchResponse = await fetch(contact.imgUrl, { signal: AbortSignal.timeout(FETCH_TIMEOUT_MS), method: 'GET'})
      const buffer = toBuffer(await response.arrayBuffer())
      await saveMediaBuffer(fileName, buffer)
      logger.debug('Saved profile picture s3 %s!', contact.id)
    }
  }
  mediaStore.saveProfilePicture = saveProfilePicture

  return { saveMedia, removeMedia, downloadMedia, getMedia, getFileName: mediaStore.getFileName, saveMediaBuffer, getFileUrl, getDownloadUrl, getProfilePictureUrl, saveProfilePicture }
}
