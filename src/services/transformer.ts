import { AnyMessageContent } from '@adiwajshing/baileys'
import mime from 'mime-types'

export const toBaileysMessageContent = (payload: any): AnyMessageContent => {
  const { type } = payload
  const response: any = {}
  switch (type) {
    case 'text':
      response.text = payload.text.body
      break

    case 'image':
    case 'audio':
    case 'document':
    case 'video':
      const url = payload[type].link
      response.caption = payload[type].caption
      response.mimeType = mime.lookup(url)
      response[type] = { url }
      break

    /*
    case 'template':
      const valuesTemplate = payload?.template
      const bindTemplate = await getTemplate(phone, valuesTemplate?.name)
      response.text = bindTemplate?.components[0]?.text
      break
    */

    default:
      throw new Error(`Unknow message type ${type}`)
  }
  return response
}

export const toBaileysJid = (phone: string) => (phone.indexOf('@') >= 0 ? phone : `${phone}@s.whatsapp.net`)

export const toBaileysMessageKey = (_phone: string, _payload: any) => {
  throw 'toBaileysMessageKey not implement yest'
}
