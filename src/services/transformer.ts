import { AnyMessageContent, WAMessage, isJidUser, normalizeMessageContent, proto } from '@whiskeysockets/baileys'
import mime from 'mime-types'
import { parsePhoneNumber } from 'awesome-phonenumber'
import vCard from 'vcf'
import logger from './logger'

export const TYPE_MESSAGES_TO_PROCESS_FILE = ['imageMessage', 'videoMessage', 'audioMessage', 'documentMessage', 'stickerMessage']

export class BindTemplateError extends Error {
  constructor() {
    super('')
  }
}

export class DecryptError extends Error {
  private content: object

  constructor(content: object) {
    super('')
    this.content = content
  }

  getContent() {
    return this.content
  }
}

const TYPE_MESSAGES_TO_PROCESS = [
  'viewOnceMessage',
  'editedMessage',
  'ephemeralMessage',
  'documentWithCaptionMessage',
  'viewOnceMessageV2',
  'imageMessage',
  'videoMessage',
  'audioMessage',
  'stickerMessage',
  'documentMessage',
  'contactMessage',
  'contactsArrayMessage',
  'extendedTextMessage',
  'reactionMessage',
  'locationMessage',
  'liveLocationMessage',
  'conversation',
  'protocolMessage',
  'senderKeyDistributionMessage',
  'messageContextInfo',
  'messageStubType',
]

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const getMessageType = (payload: any) => {
  if (payload.update) {
    return 'update'
  } else if (payload.status && ![2, '2', 'SERVER_ACK'].includes(payload.status) && !payload.key.fromMe) {
    return 'update'
  } else if (payload.receipt) {
    return 'receipt'
  } else if (payload.message) {
    const { message } = payload
    return TYPE_MESSAGES_TO_PROCESS.find((t) => message[t]) || Object.keys(payload.message)[0]
  } else if (payload.messageStubType) {
    return 'messageStubType'
  }
}

export const isSaveMedia = (message: WAMessage) => {
  const normalizedMessage = getNormalizedMessage(message)
  const messageType = normalizedMessage && getMessageType(normalizedMessage)
  return messageType && TYPE_MESSAGES_TO_PROCESS_FILE.includes(messageType)
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const getBinMessage = (waMessage: WAMessage): { messageType: string; message: any } | undefined => {
  const message: proto.IMessage | undefined = normalizeMessageContent(waMessage.message)
  const messageType = getMessageType({ message })
  if (message && messageType && message[messageType]) {
    return { messageType, message: message[messageType] }
  }
}

export const getNormalizedMessage = (waMessage: WAMessage): WAMessage | undefined => {
  const binMessage = getBinMessage(waMessage)
  if (binMessage) {
    let { message } = binMessage
    if (message.editedMessage) {
      message = message.protocolMessage?.editedMessage
    }
    return { key: waMessage.key, message: { [binMessage.messageType]: message } }
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const toBaileysMessageContent = (payload: any): AnyMessageContent => {
  const { type } = payload
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
      if (url) {
        let mimetype = mime.lookup(url.split('?')[0])
        if (type == 'audio') {
          if (mimetype == 'audio/ogg') {
            mimetype = 'audio/ogg; codecs=opus'
          }
          response.ptt = true
        }
        if (mimetype) {
          response.mimetype = mimetype
        }
        if (payload[type].filename) {
          response.fileName = payload[type].filename
        }
        if (payload[type].caption) {
          response.caption = payload[type].caption
        }
        response[type] = { url }
        break
      }
      throw new Error(`Unknow message type ${type}`)

    case 'template':
      throw new BindTemplateError()

    default:
      throw new Error(`Unknow message type ${type}`)
  }
  return response
}

export const phoneNumberToJid = (phoneNumber: string) => {
  if (phoneNumber.indexOf('@') >= 0) {
    logger.debug('%s already is jid', phoneNumber)
    return phoneNumber
  } else {
    const jid = `${jidToPhoneNumber(phoneNumber, '')}@s.whatsapp.net`
    logger.debug('transform %s to %s', phoneNumber, jid)
    return jid
  }
}

export const isIndividualJid = (jid: string) => {
  const isIndividual = isJidUser(jid)
  logger.debug('jid %s is individual? %s', jid, isIndividual)
  return isIndividual
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const isIndividualMessage = (payload: any) => {
  const {
    key: { remoteJid },
  } = payload
  return isIndividualJid(remoteJid)
}

export const formatJid = (jid: string) => {
  const jidSplit = jid.split('@')
  return `${jidSplit[0].split(':')[0]}@${jidSplit[1]}`
}

export const isValidPhoneNumber = (value: string, nine = false): boolean => {
  const number = `+${(value || '').split('@')[0].split(':')[0].replace('+', '')}`
  const country = number.replace('+', '').substring(0, 2)
  const parsed = parsePhoneNumber(number)
  const numbers = parsed?.number?.significant || ''
  const isInValid = !parsed.valid || !parsed.possible || (nine && country == '55' && numbers.length < 11 && ['6', '7', '8', '9'].includes(numbers[2]))
  if (isInValid) {
    logger.warn('phone number %s is invalid %s', value, isInValid)
  }
  return !isInValid
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const jidToPhoneNumber = (value: any, plus = '+', retry = true): string => {
  const number = (value || '').split('@')[0].split(':')[0].replace('+', '')
  const country = number.substring(0, 2)
  if (country == '55') {
    const isValid = isValidPhoneNumber(`+${number}`, true)
    if (!isValid && retry) {
      const prefix = number.substring(2, 4)
      const digits = number.match('.{8}$')[0]
      const digit = '9'
      const out = `${plus}${country}${prefix}${digit}${digits}`.replace('+', '')
      return jidToPhoneNumber(`${plus}${out}`, plus, false)
    }
  }
  return `${plus}${number.replace('+', '')}`
}

/*
{
  "object": "whatsapp_business_account",
  "entry": [{
    "id": "WHATSAPP-BUSINESS-ACCOUNT-ID",
    "changes": [{
      "value": {
        "messaging_product": "whatsapp",
        "metadata": {
          "display_phone_number": "PHONE-NUMBER",
          "phone_number_id": "PHONE-NUMBER-ID"
        },
      # Additional arrays and objects
        "contacts": [{...}]
        "errors": [{...}]
        "messages": [{...}]
        "statuses": [{...}]
      },
      "field": "messages"

    }]
  }]
}

{
  "key": {
   "remoteJid": "554999379224@s.whatsapp.net",
   "fromMe": true,
   "id": "BAE55FF6705AD8DD"
  },
  "update": {
   "status": 0,
   "messageStubParameters": [
    "405"
   ]
  }
 }
*/
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const fromBaileysMessageContent = (phone: string, payload: any): any => {
  try {
    const {
      key: { remoteJid, id: whatsappMessageId, participant, fromMe },
    } = payload
    const chatJid = formatJid(remoteJid)
    const isIndividual = isIndividualJid(chatJid)
    const senderJid = isIndividual ? chatJid : (participant && formatJid(participant)) || chatJid
    const senderPhone = jidToPhoneNumber(senderJid)
    const messageType = getMessageType(payload)
    const binMessage = payload.update || payload.receipt || (messageType && payload.message && payload.message[messageType])
    let profileName
    if (fromMe) {
      profileName = senderPhone
    } else {
      profileName = payload.verifiedBizName || payload.pushName || senderPhone
    }
    let cloudApiStatus
    let messageTimestamp = payload.messageTimestamp
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const groupMetadata: any = {}
    if (payload.groupMetadata) {
      groupMetadata.group_subject = payload.groupMetadata.subject
      groupMetadata.group_id = chatJid
      groupMetadata.group_picture = payload.groupMetadata.profilePicture
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const statuses: any[] = []
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const messages: any[] = []
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const errors: any[] = []
    const change = {
      value: {
        messaging_product: 'whatsapp',
        metadata: {
          display_phone_number: phone,
          phone_number_id: phone,
        },
        messages,
        contacts: [
          {
            profile: {
              name: profileName,
              picture: payload.profilePicture,
            },
            ...groupMetadata,
            wa_id: jidToPhoneNumber(senderPhone, ''),
          },
        ],
        statuses,
        errors,
      },
      field: 'messages',
    }
    const data = {
      object: 'whatsapp_business_account',
      entry: [
        {
          id: phone,
          changes: [change],
        },
      ],
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const message: any = {
      from: (fromMe ? phone : senderPhone).replace('+', ''),
      id: whatsappMessageId,
      timestamp: messageTimestamp,
    }
    switch (messageType) {
      case 'imageMessage':
      case 'videoMessage':
      case 'audioMessage':
      case 'stickerMessage':
      case 'documentMessage':
        const mediaType = messageType.replace('Message', '')
        const mediaKey = `${phone}/${whatsappMessageId}`
        const mimetype = (binMessage.fileName && mime.lookup(binMessage.fileName)) || binMessage.mimetype.split(';')[0]
        const extension = mime.extension(mimetype)
        const filename = binMessage.fileName || `${payload.key.id}.${extension}`
        message[mediaType] = {
          caption: binMessage.caption,
          filename,
          mime_type: mimetype,
          sha256: binMessage.fileSha256,
          url: binMessage.url && binMessage.url.indexOf('base64') < 0 ? binMessage.url : '',
          id: mediaKey,
        }
        message.type = mediaType
        break

      case 'contactMessage':
      case 'contactsArrayMessage':
        // {"key":{"remoteJid":"554988290955@s.whatsapp.net","fromMe":false,"id":"3EB03CDCC2A5D40DEFED"},"messageTimestamp":1676629371,"pushName":"Clairton Rodrigo Heinzen","message":{"contactsArrayMessage":{"contacts":[{"displayName":"Adapta","vcard":"BEGIN:VCARD\nVERSION:3.0\nN:;Adapta;;;\nFN:Adapta\nTEL;type=CELL;waid=554988333030:+55 49 8833-3030\nEND:VCARD"},{"displayName":"Silvia Castagna Heinzen","vcard":"BEGIN:VCARD\nVERSION:3.0\nN:Castagna Heinzen;Silvia;;;\nFN:Silvia Castagna Heinzen\nTEL;type=CELL;waid=554999621461:+55 49 9962-1461\nEND:VCARD"}],"contextInfo":{"disappearingMode":{"initiator":"CHANGED_IN_CHAT"}}},"messageContextInfo":{"deviceListMetadata":{"senderKeyHash":"DSu3J5WUK+vicA==","senderTimestamp":"1676571145","recipientKeyHash":"tz8qTGvqyPjOUw==","recipientTimestamp":"1666725555"},"deviceListMetadataVersion":2}}}}
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const vcards = messageType == 'contactMessage' ? [binMessage.vcard] : binMessage.contacts.map((c: any) => c.vcard)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const contacts: any[] = []
        for (let i = 0; i < vcards.length; i++) {
          const vcard = vcards[i]
          if (vcard) {
            const card: vCard = new vCard().parse(vcard.replace(/\r?\n/g, '\r\n'))
            const contact = {
              name: {
                formatted_name: card.get('fn').valueOf(),
              },
              phones: [
                {
                  phone: card.get('tel').valueOf(),
                },
              ],
            }
            contacts.push(contact)
          }
        }
        message.contacts = contacts
        message.type = 'contacts'
        break

      case 'editedMessage':
        // {"key":{"remoteJid":"120363193643042227@g.us","fromMe":false,"id":"3EB06C161FED2A9D63C767","participant":"554988290955@s.whatsapp.net"},"messageTimestamp":1698278099,"pushName":"Clairton Rodrigo Heinzen","broadcast":false,"message":{"messageContextInfo":{"deviceListMetadata":{"senderKeyHash":"ltZ5vMXiILth5A==","senderTimestamp":"1697942459","recipientKeyHash":"GVXxipL53tKc2g==","recipientTimestamp":"1697053156"},"deviceListMetadataVersion":2},"editedMessage":{"message":{"protocolMessage":{"key":{"remoteJid":"120363193643042227@g.us","fromMe":true,"id":"3EB03E16AD6F36BFCDD9F5","participant":"554988290955@s.whatsapp.net"},"type":"MESSAGE_EDIT","editedMessage":{"conversation":"Kailaine, reagenda esse pacientes da dra Eloisa que estão em dias diferentes da terça e quinta\\nQuando tiver concluido me avisa para fechar a agendar, pois foi esquecido de fechar a agenda"},"timestampMs":"1698278096189"}}}}}
        const editedMessage = binMessage.message.protocolMessage[messageType]
        const editedMessagePayload = {
          ...payload,
          message: editedMessage,
        }
        return fromBaileysMessageContent(phone, editedMessagePayload)

      case 'ephemeralMessage':
      case 'viewOnceMessage':
      case 'viewOnceMessageV2':
      // {"key":{"remoteJid":"554891710539@s.whatsapp.net","fromMe":false,"id":"3EB016D7881A2C29E25378"},"messageTimestamp":1704301811,"pushName":"Rodrigo","broadcast":false,"message":{"messageContextInfo":{"deviceListMetadata":{"senderKeyHash":"n3DiVMM5RFh8Cg==","senderTimestamp":"1703800265","recipientKeyHash":"5IqwqCOTqgXgCA==","recipientTimestamp":"1704205568"},"deviceListMetadataVersion":2},"documentWithCaptionMessage":{"message":{"documentMessage":{"url":"https://mmg.whatsapp.net/v/t62.7119-24/24248058_881769707068106_5138895532383847851_n.enc?ccb=11-4&oh=01_AdQM6YlfR3dW_UvRoLmPQeqOl08pdn8DNtTCTP1DMz4gcA&oe=65BCEDEA&_nc_sid=5e03e0&mms3=true","mimetype":"text/csv","title":"Clientes-03-01-2024-11-38-32.csv","fileSha256":"dmBD4FB1aoDA9fnIRXbvqgExKmxqK6qjGFIGETMmH4Y=","fileLength":"266154","mediaKey":"Mmu+1SthUQuVn8JM+W1Uwttkb3Vo/VQlSJQd/ddNixU=","fileName":"Clientes-03-01-2024-11-38-32.csv","fileEncSha256":"+EadJ+TTn43nOvcccdXAdHSYt9KQy+R7lcsmwkotQnY=","directPath":"/v/t62.7119-24/24248058_881769707068106_5138895532383847851_n.enc?ccb=11-4&oh=01_AdQM6YlfR3dW_UvRoLmPQeqOl08pdn8DNtTCTP1DMz4gcA&oe=65BCEDEA&_nc_sid=5e03e0","mediaKeyTimestamp":"1704301417","contactVcard":false,"contextInfo":{"ephemeralSettingTimestamp":"1702988379","disappearingMode":{"initiator":"CHANGED_IN_CHAT"}},"caption":"pode subir essa campanha por favor"}}}}}
      case 'documentWithCaptionMessage':
        const changedPayload = {
          ...payload,
          message: binMessage.message,
        }
        return fromBaileysMessageContent(phone, changedPayload)

      case 'conversation':
      case 'extendedTextMessage':
        message.text = {
          body: binMessage.text || binMessage,
        }
        message.type = 'text'
        break

      case 'reactionMessage':
        // {"key":{"remoteJid":"554988290955@s.whatsapp.net","fromMe":false,"id":"3ABBD003E80C199C7BF6"},"messageTimestamp":1676631873,"pushName":"Clairton Rodrigo Heinzen","message":{"messageContextInfo":{"deviceListMetadata":{"senderKeyHash":"31S8mj42p3wLiQ==","senderTimestamp":"1676571145","recipientKeyHash":"tz8qTGvqyPjOUw==","recipientTimestamp":"1675040504"},"deviceListMetadataVersion":2},"reactionMessage":{"key":{"remoteJid":"554988290955@s.whatsapp.net","fromMe":false,"id":"3A51A48E269AFFF123FB"},"text":"👍","senderTimestampMs":"1676631872443"}}
        message.reaction = {
          message_id: whatsappMessageId,
          emoji: binMessage.text,
        }
        message.type = 'reaction'
        break

      case 'locationMessage':
      case 'liveLocationMessage':
        const { degreesLatitude, degreesLongitude } = binMessage
        // {"key":{"remoteJid":"554988290955@s.whatsapp.net","fromMe":false,"id":"3AC859A3C2069CD40799"},"messageTimestamp":1676629467,"pushName":"Clairton Rodrigo Heinzen","message":{"locationMessage":{"degreesLatitude":-26.973182678222656,"degreesLongitude":-52.523704528808594,"jpegThumbnail":"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"},"messageContextInfo":{"deviceListMetadata":{"senderKeyHash":"31S8mj42p3wLiQ==","senderTimestamp":"1676571145","recipientKeyHash":"tz8qTGvqyPjOUw==","recipientTimestamp":"1675040504"}
        message.location = {
          latitude: degreesLatitude,
          longitude: degreesLongitude,
        }
        message.type = 'location'
        break

      case 'receipt':
        const {
          receipt: { receiptTimestamp, readTimestamp },
        } = payload
        if (readTimestamp) {
          cloudApiStatus = 'read'
          messageTimestamp = readTimestamp
        } else if (receiptTimestamp) {
          cloudApiStatus = 'delivered'
          messageTimestamp = receiptTimestamp
        }
        break

      case 'messageStubType':
        const errors = [
          'Message absent from node',
          'Invalid PreKey ID',
          'Key used already or never filled',
          'No SenderKeyRecord found for decryption',
          'No session record',
        ]
        if (payload.messageStubType == 2 && payload.messageStubParameters && errors.includes(payload.messageStubParameters[0])) {
          message.text = {
            body: '🕒 Não foi possível ler a mensagem. Peça para enviar novamente ou abra o Whatsapp no celular.',
          }
          message.type = 'text'
          change.value.messages.push(message)
          throw new DecryptError(data)
        } else {
          return
        }
        break

      case 'update':
        const baileysStatus = payload.status || payload.update.status
        if (!baileysStatus && payload.update.status != 0 && !payload?.update?.messageStubType && !payload?.update?.starred) {
          return
        }
        switch (baileysStatus) {
          case 0:
          case '0':
          case 'ERROR':
            cloudApiStatus = 'failed'
            break

          case 1:
          case '1':
          case 'PENDING':
            cloudApiStatus = 'sent'
            break

          case 2:
          case '2':
          case 'SERVER_ACK':
            cloudApiStatus = 'sent'
            break

          case 3:
          case '3':
          case 'DELIVERY_ACK':
            cloudApiStatus = 'delivered'
            break

          case 4:
          case '4':
          case 'READ':
          case 5:
          case '5':
          case 'PLAYED':
            cloudApiStatus = 'read'
            break

          case 'DELETED':
            cloudApiStatus = 'deleted'
            break

          default:
            if (payload.update && payload.update.messageStubType && payload.update.messageStubType == 1) {
              cloudApiStatus = 'deleted'
            } else if (payload?.update?.starred) {
              // starred in unknown, but if is starred the userd read the message
              cloudApiStatus = 'read'
            } else {
              cloudApiStatus = 'failed'
              payload = {
                update: {
                  error: 4,
                  title: `Unknown baileys status type ${baileysStatus}`,
                },
              }
            }
        }
        break

      case 'protocolMessage':
      case 'senderKeyDistributionMessage':
      case 'messageContextInfo':
        logger.debug(`Ignore message type ${messageType}`)
        return

      default:
        cloudApiStatus = 'failed'
        payload = {
          update: {
            error: 4,
            title: `Unknown baileys message type ${messageType}`,
          },
        }
    }
    // const repository = await getRepository(this.phone, this.config)
    if (cloudApiStatus) {
      const messageId = whatsappMessageId
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const state: any = {
        conversation: {
          id: chatJid,
          // expiration_timestamp: new Date().setDate(new Date().getDate() + 30),
        },
        id: messageId,
        recipient_id: senderPhone.replace('+', ''),
        status: cloudApiStatus,
        timestamp: messageTimestamp || Math.floor(Date.now() / 1000),
      }
      if (cloudApiStatus == 'failed') {
        // https://github.com/tawn33y/whatsapp-cloud-api/issues/40#issuecomment-1290036629
        let title = payload?.update?.title || 'The Unoapi Cloud has a error, verify the logs'
        let code = payload?.update?.code || 1
        if (payload?.update?.messageStubParameters == '405') {
          title = 'message not allowed'
          code = 8
        }
        const error = {
          code,
          title,
        }
        state.errors = [error]
      }
      change.value.statuses.push(state)
    } else {
      // {"key":{"remoteJid":"554988290955@s.whatsapp.net","fromMe":false,"id":"3A4F0B7A946F046A1AD0"},"messageTimestamp":1676632069,"pushName":"Clairton Rodrigo Heinzen","message":{"extendedTextMessage":{"text":"Isso","contextInfo":{"stanzaId":"BAE50C61B223F799","participant":"554998360838@s.whatsapp.net","quotedMessage":{"conversation":"*Odonto Excellence*: teste"}}},"messageContextInfo":{"deviceListMetadata":{"senderKeyHash":"31S8mj42p3wLiQ==","senderTimestamp":"1676571145","recipientKeyHash":"tz8qTGvqyPjOUw==","recipientTimestamp":"1675040504"},"deviceListMetadataVersion":2}}}
      const stanzaId = binMessage?.contextInfo?.stanzaId
      if (stanzaId) {
        message.context = {
          message_id: stanzaId,
          id: stanzaId,
        }
      }

      // {"key":{"remoteJid":"554936213177@s.whatsapp.net","fromMe":false,"id":"1EBD1D8356472403AFE7102D05D6B21B"},"messageTimestamp":1698057926,"pushName":"Odonto Excellence","broadcast":false,"message":{"extendedTextMessage":{"text":"https://fb.me/4QHYHT0Fv","matchedText":"https://fb.me/4QHYHT0Fv","previewType":"NONE","contextInfo":{"forwardingScore":1,"isForwarded":true,"externalAdReply":{"title":"Converse conosco!","body":"🤩 PRÓTESE FLEXÍVEL: VOCÊ JÁ CONHECE? 🤩\\n\\n✅ Maior Conforto\\n✅ Mais Natural\\n✅ Mais Bonita\\n✅ Sem Grampos Aparentes\\n\\nEstes são os benefícios que a PRÓTESE FLEXÍVEL pode te proporcionar. Tenha a sua LIBERDADE de volta, e volte a sorrir e a comer com tranquilidade!!! 🍎🌽🥩🍗\\n\\n⭐ ESSA É SUA CHANCE, NÃO DEIXE PASSAR!\\n\\n📲 Garanta sua avaliação e vamos falar a respeito dessa possibilidade de TRANSFORMAÇÃO!! 💖","mediaType":"VIDEO","thumbnailUrl":"https://scontent.xx.fbcdn.net/v/t15.5256-10/341500845_517424053756219_5530967817243282036_n.jpg?stp=dst-jpg_s851x315&_nc_cat=105&ccb=1-7&_nc_sid=0808e3&_nc_ohc=K-u3hFrS1xcAX-NaRwd&_nc_ad=z-m&_nc_cid=0&_nc_ht=scontent.xx&oh=00_AfDNIQXVcym0OF49i-UJSEX0rri9IlrwXPQkcXOpTfH-xQ&oe=653A3E2F","mediaUrl":"https://www.facebook.com/OdontoExcellenceSaoMiguel/videos/179630185187923/","thumbnail":"/9j/4AAQSkZJRgABAQAAAQABAAD/7QCEUGhvdG9zaG9wIDMuMAA4QklNBAQAAAAAAGgcAigAYkZCTUQwYTAwMGE2YzAxMDAwMGQ5MDEwMDAwNzMwMjAwMDBiZDAyMDAwMGZkMDIwMDAwODMwMzAwMDAxZDA0MDAwMDU0MDQwMDAwOTYwNDAwMDBkYTA0MDAwMGQyMDUwMDAwAP/bAEMABgQFBgUEBgYFBgcHBggKEAoKCQkKFA4PDBAXFBgYFxQWFhodJR8aGyMcFhYgLCAjJicpKikZHy0wLSgwJSgpKP/bAEMBBwcHCggKEwoKEygaFhooKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKP/CABEIADIAMgMBIgACEQEDEQH/xAAaAAADAQEBAQAAAAAAAAAAAAAABAUGAwEC/8QAFwEBAQEBAAAAAAAAAAAAAAAAAQIDBP/aAAwDAQACEAMQAAAB7LotYdhMZYrOdwuhecNATMOzmNYureQ4GdHHXONXmxwSJaaQdvKOdak0MuMJQExenyFK1ADneUCsEgM+v//EACAQAAICAgICAwAAAAAAAAAAAAECAAMEERMhBRIUIjH/2gAIAQEAAQUC3031hfqx9ytG4iZuLb3vrgdyfGXNER6i+IjThSFwRh07WnWlEyKxbXe5xLPnLFb2lFjTfEj5Lqfn9M9OSp8RVvFx/vlXqinyF5OJkKQ11Ix7by7aee6CWqjwr6u4BRVIHIQeZo37L+pV+CZQHpP/xAAgEQACAQMEAwAAAAAAAAAAAAAAAgEDEjEQERMhMkFR/9oACAEDAQE/AWSGOOFzJUT3BaIkxgslsCq6FwsRBU2iOhdvp1pXwU/LT//EAB0RAAICAQUAAAAAAAAAAAAAAAABEBEhAgMSMUH/2gAIAQIBAT8BTGxZUbjvoWkqizj6VkRcuP/EACQQAAEDAwQCAwEAAAAAAAAAAAEAAhEDECESMUFRImEEIDKB/9oACAEBAAY/Ar+1J3F828RKa4aRHBUVGwpavysoPdJnhYs5pxPK01P4e1vZjGtwhjJUNXk2UW1WYPaxUcpcITG03eY64TdWw6CfU+Q4NKjVJ9IFohb24atMyjnKww/UQhaYzb//xAAfEAEAAwEAAgMBAQAAAAAAAAABABEhMWFxQVGRoRD/2gAIAQEAAT8hqsZpCOo1gfCKSW36f7RQYbuVXsGLPSbTxVksdfnjOxb/ACFWm/UxiC46BchpDwjVaM43GfSWyx9cNsBitlCoVAsKMtA9Uv1UEYf4ngAkKSM+DJsWuAza92sGRD8NFxGszcyE+XkXYp8sUbp+T25b0eScE8oBYH1OPB8jMi309ngYoOzZ4fE3d9TmUFGu1Byf/9oADAMBAAIAAwAAABCpUH4aO33xxv8AdjiD/8QAGhEBAQEBAQEBAAAAAAAAAAAAAQARMSEQcf/aAAgBAwEBPxATSPdACcX511eQmAIml+bAHhLEM2x9NWQ5crh8/8QAGhEBAQEAAwEAAAAAAAAAAAAAAQARECExQf/aAAgBAgEBPxBTpgSHlZMcjZCWlidvac6tHvEvt44//8QAIhABAAICAwEAAQUAAAAAAAAAAQARITFBUXFhkaGxwdHh/9oACAEBAAE/ELgC6IhR1ESCHFWGi8xRFxrP+D+8pJeObUEMSiHbfsaiXJlL/JU8W88CEAakQX4OmXygd1e0CCqM/UPBXx8gSHoA49g3iVFEDuzfdRK6UiCvhPGBDJqBi+feyWmG+okWXwHcu5BhA0ZqIF5VuouFW0XqUB/Vg/2Ic4Sw7B4bMj9Imnqgujq3c1ClB+sMFSoUAVS6v5Cs1Vazt3fkU1aHEUweytNAnJsrfVzTNey/SIkytuMRZpdEXSy4G4qghkGk4hVrKwtXryAQAbSymCI0jhCj+CI5KzdABLFtwWEULXJYQxAjl0wYr/MSmXU//9k=","sourceType":"ad","sourceId":"120200422938230365","sourceUrl":"https://fb.me/4QHYHT0Fv","containsAutoReply":false,"renderLargerThumbnail":true,"showAdAttribution":true,"ctwaClid":"ARA5EWTktP0VPr7ZyKkYKKQN_HfFye5re1giQ6os1ZjiFa0Pdftvs-ESdUtWgOjkEoBsJ_mCh86z8dBguiatoESpGwM"}},"inviteLinkGroupTypeV2":"DEFAULT"},"messageContextInfo":{"deviceListMetadata":{"senderKeyHash":"BmI9Pyppe2nL+A==","senderTimestamp":"1696945176","recipientKeyHash":"ltZ5vMXiILth5A==","recipientTimestamp":"1697942459"},"deviceListMetadataVersion":2}},"verifiedBizName":"Odonto Excellence"}
      const externalAdReply = binMessage?.contextInfo?.externalAdReply
      if (externalAdReply) {
        message.referral = {
          source_url: externalAdReply.sourceUrl,
          source_id: externalAdReply.sourceId,
          source_type: externalAdReply.sourceType,
          headline: externalAdReply.title,
          body: externalAdReply.body,
          media_type: externalAdReply.mediaType,
          image_url: externalAdReply.thumbnail,
          video_url: externalAdReply.mediaUrl,
          thumbnail_url: externalAdReply.thumbnailUrl,
          ctwa_clid: externalAdReply.ctwaClid,
        }

        if (message.type == 'text') {
          message.text.body = `${message.text.body}
            ${externalAdReply.title}

            ${externalAdReply.body}
          
            ${externalAdReply.mediaUrl || externalAdReply.thumbnailUrl}
          `
        }
      }
      change.value.messages.push(message)
    }
    logger.debug('fromBaileysMessageContent %s => %s', phone, JSON.stringify(data))
    return data
  } catch (e) {
    logger.error(e, 'Error on convert baileys to cloud-api')
    throw e
  }
}
