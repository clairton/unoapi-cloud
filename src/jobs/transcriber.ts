import OpenAI, { toFile } from 'openai'
import { Webhook } from '../services/config'
import logger from '../services/logger'
import { Outgoing } from '../services/outgoing'
import { BASE_URL, OPENAI_API_KEY, UNOAPI_AUTH_TOKEN } from '../defaults'
import mediaToBuffer from '../utils/media_to_buffer'
import { extractDestinyPhone } from '../services/transformer'
import { v1 as uuid } from 'uuid'
import Audio2TextJS from 'audio2textjs'
import { writeFileSync, rmSync, existsSync, mkdirSync } from 'fs'
import { SESSION_DIR } from '../services/session_store_file'

export class TranscriberJob {
  private service: Outgoing

  constructor(service: Outgoing) {
    this.service = service
  }

  async consume(phone: string, data: object) {
    try {
      const { payload, webhooks }: { payload: any; webhooks: Webhook[] } = data as any
      const destinyPhone = extractDestinyPhone(payload)
      const payloadEntry = payload?.entry && payload.entry[0]
      const payloadValue = payloadEntry &&
        payload.entry[0].changes &&
        payload.entry[0].changes[0] &&
        payload.entry[0].changes[0].value
      const audioMessage = payloadValue &&
        payload.entry[0].changes[0].value.messages &&
        payload.entry[0].changes[0].value.messages[0]
      const mediaKey = audioMessage.audio.id
      const mediaUrl = `${BASE_URL}/v13.0/${mediaKey}`
      const { buffer, link }= await mediaToBuffer(
        mediaUrl,
        UNOAPI_AUTH_TOKEN!,
        webhooks[0].timeoutMs || 0,
      )
      let transcriptionText = ''
      if (OPENAI_API_KEY) {
        logger.debug('Transcriber audio with OpenAI for session %s to %s', phone, destinyPhone)
        const openai = new OpenAI({ apiKey: OPENAI_API_KEY })
        const splitedLink = link.split('/')
        const fileName = splitedLink[splitedLink.length - 1]
        const transcription = await openai.audio.transcriptions.create({
          file: await toFile(buffer, fileName),
          model: 'whisper-1',
        })
        transcriptionText = transcription.text
      } else {
        logger.debug('Transcriber audio with Audio2TextJS for session %s to %s', phone, destinyPhone)
        const converter = new Audio2TextJS({
            threads: 4,
            processors: 1,
            outputJson: true,
        })
        if (!existsSync(SESSION_DIR)) {
          mkdirSync(SESSION_DIR)
        }
        if (!existsSync(`${SESSION_DIR}/${mediaKey.split('/')[0]}`)) {
          mkdirSync(`${SESSION_DIR}/${mediaKey.split('/')[0]}`)
        }
        const tempFile = `${SESSION_DIR}/${mediaKey}`
        writeFileSync(tempFile, buffer)
        const result = await converter.runWhisper(tempFile, 'tiny', 'auto')
        transcriptionText = result.output
        rmSync(tempFile)
      }
      logger.debug('Transcriber audio content for session %s and to %s is %s', phone, destinyPhone, transcriptionText)
      const output = { ...payload }
      output.entry[0].changes[0].value.messages = [{
        context: {
          message_id: audioMessage.id,
          id: audioMessage.id,
        },
        from: audioMessage.from,
        id: uuid(),
        text: { body: transcriptionText },
        type: 'text',
        timestamp: `${parseInt(audioMessage.timestamp) + 1}`,
      }]
      await Promise.all(
        webhooks.map(async (w) => {
          logger.debug('Transcriber phone %s to %s sending webhook %s', phone, destinyPhone, w.id)
          return this.service.sendHttp(phone, w, output, {})
        }),
      )
    } catch (error) {
      logger.error(error)
      throw error
    }
  }
}
