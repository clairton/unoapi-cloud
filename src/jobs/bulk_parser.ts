import { detect } from 'jschardet'
import { amqpEnqueue } from '../amqp'
import axios from 'axios'
import { v1 as uuid } from 'uuid'
import { DATA_PROFILE_TTL, UNOAPI_JOB_BULK_SENDER } from '../defaults'
import { Outgoing } from '../services/outgoing'
import { jidToPhoneNumber } from '../services/transformer'
import textToSpeech, { protos } from '@google-cloud/text-to-speech'
import { getConfig } from '../services/config'
import logger from '../services/logger'
import * as XLSX from 'xlsx'
import mime from 'mime-types'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const render = (template: string, params: any) => {
  const keys = Object.keys(params)
  let string = template
  for (let i = 0, j = keys.length; i < j; i++) {
    const key = keys[i]
    const value = params[key]
    string = string.replaceAll(`#${key}`, value)
  }
  return string
}

const synthesize = async (phone: string, getConfig: getConfig, text: string) => {
  const config = await getConfig(phone)
  const store = await config.getStore(phone, config)
  const { mediaStore } = store
  const client = new textToSpeech.TextToSpeechClient()

  const request: protos.google.cloud.texttospeech.v1.ISynthesizeSpeechRequest = {
    input: { text },
    voice: { languageCode: 'pt-BR' },
    audioConfig: { audioEncoding: 'MP3' },
  }

  const speech = await client.synthesizeSpeech(request)
  const response = speech[0]
  if (!response.audioContent) {
    throw 'speech is null'
  }
  const buffer: Buffer = Buffer.from(response.audioContent)
  const fileName = `${phone}/${uuid()}.mp3`
  await mediaStore.saveMediaBuffer(fileName, buffer)
  const link = await mediaStore.getFileUrl(fileName, DATA_PROFILE_TTL)
  return link
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const formatters: any = {
  default: async (
    phone: string,
    getConfig: getConfig,
    row: { number: string; country: string | undefined; message: string; type: string | undefined; url: string | undefined },
  ) => {
    const type = row.type || 'text'
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const message: any = {
      id: uuid(),
      payload: {
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        to: formatNumber(row.number, row.country!),
        type,
      },
    }
    if (type == 'text') {
      message.payload.text = {
        body: row.message,
      }
    } else if (type == 'speech') {
      const link = await synthesize(phone, getConfig, row.message)
      message.payload.audio = {
        link,
      }
      message.payload.type = 'audio'
    } else {
      message.payload[type] = {
        caption: row.message,
        link: row.url,
      }
    }
    return message
  },
  sisodonto: async (
    phone: string,
    getConfig: getConfig,
    row: { NOME: string; MENSAGEM: string; TELEFONE: string; TIPO: string | undefined; URL: string | undefined },
  ) => {
    const { NOME, MENSAGEM, TELEFONE } = row
    const PRIMEIRO_NOME = capitalize(NOME.split(' ')[0])
    const to = formatNumber(TELEFONE, '55')
    const type = row.TIPO || 'text'
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const message: any = {
      id: uuid(),
      payload: {
        to,
        type,
      },
    }
    if (type == 'text') {
      message.payload.text = {
        body: render(MENSAGEM, { ...row, NOME: PRIMEIRO_NOME, firt_name: PRIMEIRO_NOME }),
      }
    } else if (type == 'speech') {
      const text = render(MENSAGEM, { ...row, NOME: PRIMEIRO_NOME, firt_name: PRIMEIRO_NOME })
      const link = await synthesize(phone, getConfig, text)
      message.payload.audio = {
        link,
      }
      message.payload.type = 'audio'
    } else {
      message.payload[type] = {
        caption: render(MENSAGEM, { ...row, NOME: PRIMEIRO_NOME, firt_name: PRIMEIRO_NOME }),
        link: row.URL,
      }
    }
    return message
  },
}

const capitalize = (word: string) => {
  const string = word.toLowerCase()
  return `${string[0].toUpperCase()}${string.substring(1)}`
}

const formatNumber = (number: string, country: string | null) => {
  let removeWhiteSpace = number.replace(/\s/g, '')
  if (!country) {
    country = removeWhiteSpace.substring(0, 2)
    removeWhiteSpace = removeWhiteSpace.substring(2)
  } else if (removeWhiteSpace[0] == '0') {
    removeWhiteSpace = removeWhiteSpace.substring(1)
  }
  return jidToPhoneNumber(`${country}${removeWhiteSpace}`, '')
}

const convert = (file: string) => {
  const json: string[] = []
  const rows: string[] = file.split('\n')
  const columns = rows
    .shift()
    ?.split(';')
    .map((column) => column.replace(/[^a-zA-Z0-9]/, '').toUpperCase())
  rows.forEach((row) => {
    const values = row.split(';')
    if (values.length <= 1) {
      return
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const object: any = {}
    for (let i = 0, j = values.length; i < j; i++) {
      const data = values[i].replace(/^['"]|['"]$/g, '')
      const column = columns && columns[i]
      if (column) {
        object[column] = data
      }
    }
    json.push(object)
  })
  return json
}

export class BulkParserJob {
  private outgoing: Outgoing
  private queueBulkSender: string
  private getConfig: getConfig

  constructor(outgoing: Outgoing, getConfig: getConfig, queueBulkSender: string = UNOAPI_JOB_BULK_SENDER) {
    this.outgoing = outgoing
    this.getConfig = getConfig
    this.queueBulkSender = queueBulkSender
  }

  async consume(phone: string, data: object) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { payload } = data as any
    const { template: defaultTemplate, url, id } = payload
    try {
      logger.debug(`Bulk parser phone ${phone}`)
      const template = defaultTemplate || 'sisodonto'
      const fomatter = formatters[template]
      let buffer
      let type: string | false = 'csv'
      if (url.indexOf('base64') >= 0) {
        logger.debug(`Downloadind base64...!`)
        const contentType = url.split(':')[1].split(';')[0]
        type = mime.extension(contentType)
        const parts = url.split(',')
        const base64 = parts[1]
        buffer = Buffer.from(base64, 'base64')
        logger.debug(`Downloaded base64!`)
      } else {
        logger.debug(`Downloadind url...!`)
        const response = await axios.get(url, { responseType: 'arraybuffer' })
        const headers = response.headers
        const contentType = headers['content-type']
        type = mime.extension(contentType)
        logger.debug(`Downloaded url!`)
        buffer = Buffer.from(response.data)
      }
      let { encoding } = detect(buffer)
      if (!encoding) {
        encoding = 'utf8'
      } else if (encoding == 'windows-1252') {
        encoding = 'latin1'
      }
      logger.debug('Bulk type %s', type)
      let csvData
      if (type && ['xlsx', 'xls'].includes(type)) {
        const workBook: XLSX.WorkBook = XLSX.read(buffer)
        const worksheet: XLSX.WorkSheet = workBook.Sheets[workBook.SheetNames[0]]
        csvData = XLSX.utils.sheet_to_csv(worksheet, { FS: ';', blankrows: false })
      } else if (type == 'csv') {
        csvData = buffer.toString(encoding as BufferEncoding)
      } else {
        throw `unknown type ${type}`
      }
      logger.debug('Bulk parser csv %s', csvData)
      const rows = convert(csvData)
      logger.debug('Bulk parser rows %s', JSON.stringify(rows))
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const messages: any[] = []
      for (let i = 0, j = rows.length; i < j; i++) {
        const row = rows[i]
        const message = await fomatter(phone, this.getConfig, row)
        messages.push(message)
      }
      const message = {
        type: 'text',
        from: phone,
        text: {
          body: `The bulk ${id} was parsed and found ${messages.length} message(s)!`,
        },
      }
      this.outgoing.formatAndSend(phone, phone, message)
      await amqpEnqueue(this.queueBulkSender, phone, {
        payload: { messages, id, length: messages.length },
      })
    } catch (error) {
      logger.error(error, 'Error on parse bulk')
      const message = {
        from: phone,
        type: 'text',
        text: {
          body: `Error on parse bulk: ${error?.message}`,
        },
      }
      this.outgoing.formatAndSend(phone, phone, message)
      throw error
    }
  }
}
