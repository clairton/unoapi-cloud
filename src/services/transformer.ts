import { AnyMessageContent } from '@adiwajshing/baileys'
import mime from 'mime-types'
import { parsePhoneNumber } from 'awesome-phonenumber'
import vCard from 'vcf'
import template from '../services/template'

export const TYPE_MESSAGES_TO_PROCESS_FILE = ['imageMessage', 'videoMessage', 'audioMessage', 'documentMessage', 'stickerMessage']

const TYPE_MESSAGES_TO_PROCESS = [
  'viewOnceMessage',
  'ephemeralMessage',
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
  } else if (payload.receipt) {
    return 'receipt'
  } else if (payload.message) {
    const { message } = payload
    return TYPE_MESSAGES_TO_PROCESS.find((t) => message[t]) || Object.keys(payload.message)[0]
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
      response.caption = payload[type].caption
      response.mimeType = mime.lookup(url)
      response[type] = { url }
      break

    case 'template':
      response.text = template?.components[0]?.text
      break

    default:
      throw new Error(`Unknow message type ${type}`)
  }
  return response
}

export const phoneNumberToJid = (phoneNumber: string) => {
  if (phoneNumber.indexOf('@') >= 0) {
    console.debug('%s already is jid', phoneNumber)
    return phoneNumber
  } else {
    const jid = `${jidToPhoneNumber(phoneNumber, '')}@s.whatsapp.net`
    console.debug('transform %s to %s', phoneNumber, jid)
    return jid
  }
}

export const isIndividualJid = (jid: string) => {
  const isIndividual = jid.indexOf('@s.whatsapp.net') >= 0
  console.debug('jid %s is individual? %s', jid, isIndividual)
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

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const jidToPhoneNumber = (id: any, plus = '+'): string => {
  const number = (id || '').split('@')[0].split(':')[0].replace('+', '')
  const country = number.substring(0, 2)
  if (country == '55') {
    const phoneNumber = parsePhoneNumber(number, { regionCode: 'BR' })
    const nationalNumber = phoneNumber?.number?.significant || ''
    if (!phoneNumber.valid && nationalNumber?.length < 11) {
      const country = '55'
      const prefix = number.substring(2, 4)
      const digits = number.match('.{8}$')[0]
      const digit = '9'
      const out = `${plus}${country}${prefix}${digit}${digits}`.replace('+', '')
      return jidToPhoneNumber(`${plus}${out}`, plus)
    }
    return `${plus}${phoneNumber?.number?.e164?.replace('+', '')}`
  } else {
    return `${plus}${number.replace('+', '')}`
  }
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
*/
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const fromBaileysMessageContent = (phone: string, payload: any): any => {
  try {
    console.debug(`fromBaileysMessageContent %s`, JSON.stringify(payload))
    const {
      key: { remoteJid, id: whatsappMessageId, participant, fromMe },
    } = payload
    const chatJid = formatJid(remoteJid)
    const isIndividual = isIndividualJid(chatJid)
    const senderJid = formatJid(isIndividual ? chatJid : formatJid(participant))
    const senderPhone = jidToPhoneNumber(senderJid)
    const messageType = getMessageType(payload)
    const binMessage = payload.update || payload.receipt || (messageType && payload.message[messageType])
    let profileName
    if (fromMe) {
      profileName = senderPhone
    } else {
      profileName = payload.verifiedBizName || payload.pushName
    }
    let cloudApiStatus
    let messageTimestamp = payload.messageTimestamp
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const groupMetadata: any = {}
    if (payload.groupMetadata) {
      groupMetadata.group_subject = payload.groupMetadata.subject
      groupMetadata.group_id = chatJid
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const statuses: any[] = []
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const messages: any[] = []
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
            },
            ...groupMetadata,
            wa_id: senderPhone.replace('+', ''),
          },
        ],
        statuses,
        errors: [],
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
      from: senderPhone.replace('+', ''),
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
        const mimetype = binMessage.mimetype.split(';')[0]
        message[mediaType] = {
          caption: binMessage.caption,
          mime_type: mimetype,
          sha256: binMessage.fileSha256,
          url: binMessage.url,
          id: mediaKey,
        }
        message.type = mediaType
        break

      case 'contactMessage':
      case 'contactsArrayMessage':
        // {"key":{"remoteJid":"554988290955@s.whatsapp.net","fromMe":false,"id":"3EB03CDCC2A5D40DEFED"},"messageTimestamp":1676629371,"pushName":"Clairton Rodrigo Heinzen","message":{"contactsArrayMessage":{"contacts":[{"displayName":"Adapta","vcard":"BEGIN:VCARD\nVERSION:3.0\nN:;Adapta;;;\nFN:Adapta\nTEL;type=CELL;waid=554988333030:+55 49 8833-3030\nEND:VCARD"},{"displayName":"Silvia Castagna Heinzen","vcard":"BEGIN:VCARD\nVERSION:3.0\nN:Castagna Heinzen;Silvia;;;\nFN:Silvia Castagna Heinzen\nTEL;type=CELL;waid=554999621461:+55 49 9962-1461\nEND:VCARD"}],"contextInfo":{"disappearingMode":{"initiator":"CHANGED_IN_CHAT"}}},"messageContextInfo":{"deviceListMetadata":{"senderKeyHash":"DSu3J5WUK+vicA==","senderTimestamp":"1676571145","recipientKeyHash":"tz8qTGvqyPjOUw==","recipientTimestamp":"1666725555"},"deviceListMetadataVersion":2}}}}
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const vcards = messageType == 'contactMessage' ? [binMessage.vcard] : binMessage.contacts.map((c: any) => c.vcard)
        const contacts = []
        for (let i = 0; i < vcards.length; i++) {
          const vcard = vcards[i]
          if (vcard) {
            const card: vCard = new vCard().parse(vcard)
            contacts.push({
              name: {
                formatted_name: card.get('fn').valueOf(),
              },
              phones: card.get('tel').valueOf(),
            })
          }
        }
        message.contacts = contacts
        message.type = 'contacts'
        break

      case 'ephemeralMessage':
      case 'viewOnceMessage':
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
        // {"key":{"remoteJid":"554988290955@s.whatsapp.net","fromMe":false,"id":"3AC859A3C2069CD40799"},"messageTimestamp":1676629467,"pushName":"Clairton Rodrigo Heinzen","message":{"locationMessage":{"degreesLatitude":-26.973182678222656,"degreesLongitude":-52.523704528808594,"jpegThumbnail":"/9j/4AAQSkZJRgABAQAASABIAAD/4QBMRXhpZgAATU0AKgAAAAgAAgESAAMAAAABAAEAAIdpAAQAAAABAAAAJgAAAAAAAqACAAQAAAABAAAAZKADAAQAAAABAAAAZAAAAAD/7QA4UGhvdG9zaG9wIDMuMAA4QklNBAQAAAAAAAA4QklNBCUAAAAAABDUHYzZjwCyBOmACZjs+EJ+/8AAEQgAZABkAwEiAAIRAQMRAf/EAB8AAAEFAQEBAQEBAAAAAAAAAAABAgMEBQYHCAkKC//EALUQAAIBAwMCBAMFBQQEAAABfQECAwAEEQUSITFBBhNRYQcicRQygZGhCCNCscEVUtHwJDNicoIJChYXGBkaJSYnKCkqNDU2Nzg5OkNERUZHSElKU1RVVldYWVpjZGVmZ2hpanN0dXZ3eHl6g4SFhoeIiYqSk5SVlpeYmZqio6Slpqeoqaqys7S1tre4ubrCw8TFxsfIycrS09TV1tfY2drh4uPk5ebn6Onq8fLz9PX29/j5+v/EAB8BAAMBAQEBAQEBAQEAAAAAAAABAgMEBQYHCAkKC//EALURAAIBAgQEAwQHBQQEAAECdwABAgMRBAUhMQYSQVEHYXETIjKBCBRCkaGxwQkjM1LwFWJy0QoWJDThJfEXGBkaJicoKSo1Njc4OTpDREVGR0hJSlNUVVZXWFlaY2RlZmdoaWpzdHV2d3h5eoKDhIWGh4iJipKTlJWWl5iZmqKjpKWmp6ipqrKztLW2t7i5usLDxMXGx8jJytLT1NXW19jZ2uLj5OXm5+jp6vLz9PX29/j5+v/bAEMABgYGBgYGCgYGCg4KCgoOEg4ODg4SFxISEhISFxwXFxcXFxccHBwcHBwcHCIiIiIiIicnJycnLCwsLCwsLCwsLP/bAEMBBwcHCwoLEwoKEy4fGh8uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLv/dAAQAB//aAAwDAQACEQMRAD8A+mgQRkdDS0hwGBX7r8j69xS1k1Yo5+70qzGpJqZhMsn8CKu4mUEkMSeFC/UD16Cte1knkgU3SBJhxIoOQGHp7HqKmkTzEaPcV3DGVOCPoe1YGn/aLWVPtDJAkxwIAOSx4Jzy7MGHLHgqc8VW6EdDQrFVMo6v8q/T1o2728v8/YUnzyOWVDgcL2AH40JdQYAbRgUtIRj77hfYcmk+Tshb3c8flS5e47hvXOByfbmsu/t4XuI2uYWuPMUpHAcEbly27BIXp1z7Vr7pMYyFHoorP1GKBrR3nCkRjfukDMFx1PykHpnoaashFuM5RTLkNjlEwQPbI4qQHbzGir7nk1i6E7PZndgAtuVVi8pVVug/2j3JyeTjNbdDdtgsJmQ8lz+GBRl/77UtFTdjsf/Q+mgM5iPG7lT6NTQ478H075pf3eQfmcjn0FPMkhJIATPpyajTqMaFkIyFwPVuKzZo3iuxJaKkkl0BE7NnauwEg8c8jjGQK0SoPLZY+/NV72Bri0kgUhSwHXODgg4OOcHGD7UJoCaB5FiABQnozKOpHtk/zNcz4q1qXS7eCKKQJNdSCNZH+5GP4nIHXGa2rK0a1eVnWOPzdrCOEYRQARnoMk9zgdqw/F3h+TXrBVtiBPAxZM8Bs9Vz2zWWIc+R8m53ZYqP1mH1j4b6/p+J5rP4k1rRdWkji1AX0cbDJ6xuMZOB29ODXtdjdx39nDexDCzIHA9MjpXgtr4S1q4umtpIvJEZAkdyMLnn1549K9otLi1sLWKxtyWWFAg/AVx4L2jcuZaHvcSfU1GmqDTn1att520N2jGeOmePzqpFP5oyWVB7nJqx+7/2pP0FehynylznbCX7PevHc3UsrFyixfPIqbmO3e5GN3GBg/nXSBZDyFwPVuK5nUnSC+e4CxrMiK8RkLuXIzhI0BA4P1wTnFdKVycvkn35xVO24g+XvKPwGaPk/wCev/jtLS1N12Cx/9H6booorEoKSlooAQK7IjIMlcqe3SkIA4dwD6KMmjGUkT6MPw60DAHHSrb6iOYuC32i78pc/MvLdvlFY4tryZ/mY49BxXRJhry8X/bT/wBAFaUMUaDLYFDkwsUdOszAMt1rapFDH7ik/oP1oIx991X2HJpWY7kUsC3DJG7yIvOQjbc/Ujn8iKWPaiLEoPyjbjknj65P51JuRPnCsxHOWOP0qSR38wqrbRgEY75p20ENCynkIfxIFLsm/ufqKj2A9cn6k0bF9P1NLQep/9L6booorEoKKKKAEB2yK3vg/jSGORBtJVQOhJ7UpAIwaTYuc4yfU81SemoGHaW10t9cy3QRo5GBjMZOTgY+bIAHHoTW4pKj92qp79TTqKOYLDSC332J/l+lKAB0GKWilcBKaThEY/w5Q/0p9IC6Z2EAHnkZpp9wYgJPIVj+FL839xvyoy56u38qPn/vt+dGgH//0/puiimSSJDG0srBUQFmJ6ADkmsSh9Fec3HxE0ZrmBbSY+SHImzExdhj5Qg6YJ6nr6Ctu68Rva+JbXRnjH2e5iDeYchldyQoPoDjHrmnYDq6K5XVvEMljrmn6NbxrIblwJmOfkVshcY7nB6+laMfiDRpb3+z47pGmLFAvOCw6qGxtJ9s0AbNFYLeJ9ASUQteRhi5j5zgMDtwTjA545qW78QaNYXP2S7ukjlGMg5O3d03EAhc++KANmisi717R7G4+y3dykcmASOSFDdCxAIXPbJFa3XkUgFooooAKKKKAP/U+m6p39oL6xnsmO0TxtHn03DGauUViUfNKeDfFdtchorJy0UoCuMbcg8Hr933r1zUtGvtS1K4My7XbT4wkqj5BcpIXG36H9K7qincDzmHTdWuWstXvbcrdz6hHNMn/PKKNGRQfYdfxqitnrtz9ijuILlZIL6OSWMJGlsiiTOY9o3NxznPrmvVKKLgeTWxup9D1TSbbT5J3vLu4VJVC+XkvjLknK7O3H0qbVbHXZLfUdOMVwxeMLD9nSMRSqqAbpHI3Fsjp19K9Mt7a3tUMdtGsaszOQowCzHJP1Jqei4Hmuo2eowvM1hbXSXE0MS/IqS287KgGJVf7mOh9q9FhEghjEoAcKNwXoDjkD29KlooAKKKKQBRRRQB/9X6booorEoKKKKACiiigAooooAKKKKACiiigAooooA//9k="},"messageContextInfo":{"deviceListMetadata":{"senderKeyHash":"31S8mj42p3wLiQ==","senderTimestamp":"1676571145","recipientKeyHash":"tz8qTGvqyPjOUw==","recipientTimestamp":"1675040504"}
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

      case 'update':
        const baileysStatus = payload.status || payload.update.status
        switch (baileysStatus) {
          case 0:
          case '0':
          case 'ERROR':
            cloudApiStatus = 'failed'
            break

          case 1:
          case '1':
          case 'PENDING':
            cloudApiStatus = 'progress'
            return

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
      case 'messageStubType':
        console.debug(`Ignore message type ${messageType}`)
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
        id: messageId,
        recipient_id: phone.replace('+', ''),
        status: cloudApiStatus,
        timestamp: messageTimestamp || Math.floor(Date.now() / 1000),
      }
      if (cloudApiStatus == 'failed') {
        // https://github.com/tawn33y/whatsapp-cloud-api/issues/40#issuecomment-1290036629
        const error = {
          code: payload?.update?.code || 1,
          title: payload?.update?.title || 'The Baileys CLOUD API has a error, verify the logs',
        }
        state.errors = [error]
      }
      change.value.statuses.push(state)
    } else {
      // const remoteJid = await formatJid(payload.key.remoteJid)
      // const participant = remoteJid && !isIndividual && payload?.key?.participant ? formatJid(payload.key.participant) : null
      // await repository.setMessageSender(this.phone, payload.key.id, { remoteJid, participant })
      // {"key":{"remoteJid":"554988290955@s.whatsapp.net","fromMe":false,"id":"3A4F0B7A946F046A1AD0"},"messageTimestamp":1676632069,"pushName":"Clairton Rodrigo Heinzen","message":{"extendedTextMessage":{"text":"Isso","contextInfo":{"stanzaId":"BAE50C61B223F799","participant":"554998360838@s.whatsapp.net","quotedMessage":{"conversation":"*Odonto Excellence*: teste"}}},"messageContextInfo":{"deviceListMetadata":{"senderKeyHash":"31S8mj42p3wLiQ==","senderTimestamp":"1676571145","recipientKeyHash":"tz8qTGvqyPjOUw==","recipientTimestamp":"1675040504"},"deviceListMetadataVersion":2}}}
      if (binMessage?.contextInfo?.quotedMessage?.stanzaId) {
        message.context = {
          message_id: binMessage?.contextInfo?.quotedMessage?.stanzaId,
        }
      }
      change.value.messages.push(message)
    }
    return data
  } catch (e) {
    console.error('Error on convert baileys to cloud-api', e)
    throw e
  }
}
