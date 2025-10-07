import fetch, { Response, RequestInit } from 'node-fetch'
import logger from '../services/logger'
import { toBuffer } from '../services/transformer'

export default async function (url: string, token: string, timeoutMs: number) {
  const headers = {
    'Content-Type': 'application/json; charset=utf-8',
    Authorization: `Bearer ${token}`,
  }
  const options: RequestInit = { method: 'GET', headers }
  if (timeoutMs > 0) {
    options.signal = AbortSignal.timeout(timeoutMs)
  }
  let response: Response
  try {
    logger.debug('Requesting media url %s...', url)
    response = await fetch(url, options)
    logger.debug('Requested media url %s!', url)
  } catch (error) {
    logger.error(`Error on Request media url ${url}`)
    logger.error(error)
    throw error
  }
  if (!response?.ok) {
    logger.error(`Error on Request media url ${url}`)
    throw await response.text()
  }
  const clonedResponse = response.clone()
  const json = await response.json()
  const link = json['url']
  if (!link) {
    const message = `Error on retrieve media url on response: ${await clonedResponse.text()}`
    logger.error(message)
    throw message
  }
  logger.debug('Downloading media url %s...', link)
  response = await fetch(link, options)
  logger.debug('Downloaded media url %s!', link)
  if (!response?.ok) {
    logger.error(`Error on download media url ${link}`)
    throw await response.text()
  }
  const arrayBuffer = await response.arrayBuffer()
  return { buffer: toBuffer(arrayBuffer), link, mimeType: json['mime_type'] }
}
