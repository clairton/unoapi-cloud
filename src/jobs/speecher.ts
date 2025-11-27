import OpenAI from 'openai'
import { getConfig } from '../services/config'
import logger from '../services/logger'
import { DATA_URL_TTL } from '../defaults'
import { Incoming } from '../services/incoming'

export class SpeecherJob {
  private service: Incoming
  private getConfig: getConfig

  constructor(service: Incoming, getConfig: getConfig) {
    this.service = service
    this.getConfig = getConfig
  }

  async consume(phone: string, data: object) {
    const { payload, id }: { payload: any; id: string } = { ...data } as any
    logger.debug('speecher session %s to %s text s%', phone, payload.to, payload.speech.body)
    const config = await this.getConfig(phone)
    const openai = new OpenAI({ apiKey: config.openaiApiKey })
    const audio = await openai.audio.speech.create({
      model: config.openaiApiSpeechModel!,
      voice: config.openaiApiSpeechVoice!,
      input: payload.speech.body,
      response_format: 'opus'
    })
    const buffer = Buffer.from(await audio.arrayBuffer())
    const { mediaStore } = await config.getStore(phone, config)
    const fileName = `${phone}/${id}.ogg`
    await mediaStore.saveMediaBuffer(fileName, buffer)
    const link = await mediaStore.getFileUrl(fileName, DATA_URL_TTL)
    payload.type = 'audio'
    payload.audio = { link, voice: true,  mime_type: 'audio/ogg; codecs=opus' }
    delete payload.speech
    return this.service.send(phone, payload, {})
  }
}
