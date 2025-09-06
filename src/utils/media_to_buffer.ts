
import fetch, { Response, RequestInit } from 'node-fetch'
import logger from '../services/logger'
import { toBuffer } from '../services/transformer'

export default async function (url: string, token: string, timeoutMs: number) {
  const headers = {
    'Content-Type': 'application/json; charset=utf-8',
    'Authorization': `Bearer ${token}`
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
  const mediaUrl = json['url']
  if (!mediaUrl) {
    const message = `Error on retrieve media url on response: ${await clonedResponse.text()}`
    logger.error(message)
    throw message
  }
  logger.debug('Downloading media url %s...', mediaUrl)
  response = await fetch(mediaUrl, options)
  logger.debug('Downloaded media url %s!', mediaUrl)
  if (!response?.ok) {
    logger.error(`Error on download media url ${mediaUrl}`)
    throw await response.text()
  }
  const arrayBuffer = await response.arrayBuffer()
  return { buffer: toBuffer(arrayBuffer), link: json['url'] }
}