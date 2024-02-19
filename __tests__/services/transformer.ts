import { WAMessage, proto } from '@whiskeysockets/baileys'
import {
  phoneNumberToJid,
  getMessageType,
  isIndividualJid,
  isIndividualMessage,
  formatJid,
  jidToPhoneNumber,
  fromBaileysMessageContent,
  toBaileysMessageContent,
  isValidPhoneNumber,
  DecryptError,
  getNormalizedMessage,
  isSaveMedia,
} from '../../src/services/transformer'
const key = { remoteJid: 'XXXX@s.whatsapp.net', id: 'abc' }

const documentMessage: proto.Message.IDocumentMessage = {
  url: 'https://mmg.whatsapp.net/v/t62.7119-24/24248058_881769707068106_5138895532383847851_n.enc?ccb=11-4&oh=01_AdQM6YlfR3dW_UvRoLmPQeqOl08pdn8DNtTCTP1DMz4gcA&oe=65BCEDEA&_nc_sid=5e03e0&mms3=true',
  mimetype: 'text/csv',
  title: 'Clientes-03-01-2024-11-38-32.csv',
  caption: 'pode subir essa campanha por favor',
}
const inputDocumentWithCaptionMessage: WAMessage = {
  key,
  message: {
    documentWithCaptionMessage: { message: { documentMessage } },
  },
}
const inputDocumentMessage: WAMessage = {
  key,
  message: { documentMessage },
}

describe('service transformer', () => {
  test('phoneNumberToJid with nine digit', async () => {
    expect(phoneNumberToJid('+5549988290955')).toEqual('5549988290955@s.whatsapp.net')
  })

  test('phoneNumberToJid', async () => {
    expect(phoneNumberToJid('+554988290955')).toEqual('5549988290955@s.whatsapp.net')
  })

  test('phoneNumberToJid with group jid', async () => {
    const jid = '123456789-123345@g.us'
    expect(phoneNumberToJid(jid)).toEqual(jid)
  })

  test('phoneNumberToJid with fixed line', async () => {
    expect(phoneNumberToJid('+554936213155')).toEqual('554936213155@s.whatsapp.net')
  })

  test('phoneNumberToJid with fixed line', async () => {
    expect(phoneNumberToJid('554936213155')).toEqual('554936213155@s.whatsapp.net')
  })

  test('getMessageType with conversation', async () => {
    expect(getMessageType({ message: { conversation: 'test' } })).toEqual('conversation')
  })

  test('getMessageType with imageMessage', async () => {
    expect(getMessageType({ message: { imageMessage: {} } })).toEqual('imageMessage')
  })

  test('getMessageType with status 3 and fromMe false', async () => {
    const input = {
      key: {
        remoteJid: '554988290955@s.whatsapp.net',
        fromMe: false,
        id: '3AB4BB2F72F2D4692924',
      },
      status: 3,
      message: {
        conversation: 'Iiiiiiiiiiiiii',
      },
    }
    expect(getMessageType(input)).toEqual('update')
  })

  test('getMessageType with status 2 and fromMe false', async () => {
    const input = {
      key: {
        remoteJid: '554988290955@s.whatsapp.net',
        fromMe: false,
        id: '3AB4BB2F72F2D4692924',
      },
      status: 2,
      message: {
        conversation: 'Iiiiiiiiiiiiii',
      },
    }
    expect(getMessageType(input)).toEqual('conversation')
  })

  test('getMessageType with update', async () => {
    const input = {
      key: {
        fromMe: false,
      },
      status: 3,
      message: {
        conversation: 'si9fuwerhwrklk',
      },
    }
    expect(getMessageType(input)).toEqual('update')
  })

  test('isIndividualJid is true', async () => {
    expect(isIndividualJid('12345678901@s.whatsapp.net')).toEqual(true)
  })

  test('isIndividualJid is false', async () => {
    expect(isIndividualJid('12345678901@g.us')).toEqual(false)
  })

  test('isIndividualMessage is false', async () => {
    expect(isIndividualMessage({ key: { remoteJid: '12345678901@g.us' } })).toEqual(false)
  })

  test('formatJid', async () => {
    expect(formatJid('12345678901:123@s.whatsapp.net')).toEqual('12345678901@s.whatsapp.net')
  })

  test('jidToPhoneNumber with +', async () => {
    expect(jidToPhoneNumber('12345678901:123@s.whatsapp.net')).toEqual('+12345678901')
  })

  test('jidToPhoneNumber Fixed +', async () => {
    expect(jidToPhoneNumber('554936213177@s.whatsapp.net')).toEqual('+554936213177')
  })

  test('jidToPhoneNumber without + and put 9˚ digit', async () => {
    expect(jidToPhoneNumber('+554988290955@s.whatsapp.net', '')).toEqual('5549988290955')
  })

  test('fromBaileysMessageContent with messageContextInfo', async () => {
    const phoneNumer = '5549998360838'
    const remoteJid = '554988290955@s.whatsapp.net'
    const body = `${new Date().getTime()}`
    const id = `wa.${new Date().getTime()}`
    const pushName = `Mary ${new Date().getTime()}`
    const messageTimestamp = Math.floor(new Date().getTime() / 1000).toString()
    const input = {
      key: {
        remoteJid,
        fromMe: false,
        id,
      },
      message: {
        messageContextInfo: body,
      },
      pushName,
      messageTimestamp,
    }
    const output = undefined
    expect(fromBaileysMessageContent(phoneNumer, input)).toEqual(output)
  })

  test('fromBaileysMessageContent with text', async () => {
    const phoneNumer = '5549998360838'
    const remotePhoneNumer = '554988290955'
    const remoteJid = `${remotePhoneNumer}@s.whatsapp.net`
    const body = `${new Date().getTime()}`
    const id = `wa.${new Date().getTime()}`
    const pushName = `Mary ${new Date().getTime()}`
    const messageTimestamp = Math.floor(new Date().getTime() / 1000).toString()
    const input = {
      key: {
        remoteJid,
        fromMe: false,
        id,
      },
      message: {
        conversation: body,
      },
      pushName,
      messageTimestamp,
    }
    const output = {
      object: 'whatsapp_business_account',
      entry: [
        {
          id: phoneNumer,
          changes: [
            {
              value: {
                messaging_product: 'whatsapp',
                metadata: { display_phone_number: phoneNumer, phone_number_id: phoneNumer },
                messages: [
                  {
                    from: '5549988290955',
                    id,
                    timestamp: messageTimestamp,
                    text: { body },
                    type: 'text',
                  },
                ],
                contacts: [{ profile: { name: pushName }, wa_id: '5549988290955' }],
                statuses: [],
                errors: [],
              },
              field: 'messages',
            },
          ],
        },
      ],
    }
    expect(fromBaileysMessageContent(phoneNumer, input)).toEqual(output)
  })

  test('fromBaileysMessageContent with quoted', async () => {
    const phoneNumer = '5549998360838'
    const remotePhoneNumer = '554988290955'
    const remoteJid = `${remotePhoneNumer}@s.whatsapp.net`
    const body = `${new Date().getTime()}`
    const id = `wa.${new Date().getTime()}`
    const pushName = `Mary ${new Date().getTime()}`
    const messageTimestamp = Math.floor(new Date().getTime() / 1000).toString()
    const stanzaId = `${new Date().getTime()}`
    const input = {
      key: {
        remoteJid,
        fromMe: false,
        id,
      },
      message: {
        extendedTextMessage: {
          text: body,
          contextInfo: {
            stanzaId,
          },
        },
      },
      pushName,
      messageTimestamp,
    }
    const output = {
      object: 'whatsapp_business_account',
      entry: [
        {
          id: phoneNumer,
          changes: [
            {
              value: {
                messaging_product: 'whatsapp',
                metadata: { display_phone_number: phoneNumer, phone_number_id: phoneNumer },
                messages: [
                  {
                    context: {
                      message_id: stanzaId,
                      id: stanzaId,
                    },
                    from: '5549988290955', // with 9 digit
                    id,
                    timestamp: messageTimestamp,
                    text: { body },
                    type: 'text',
                  },
                ],
                contacts: [{ profile: { name: pushName }, wa_id: '5549988290955' }],
                statuses: [],
                errors: [],
              },
              field: 'messages',
            },
          ],
        },
      ],
    }
    expect(fromBaileysMessageContent(phoneNumer, input)).toEqual(output)
  })

  test('fromBaileysMessageContent with media', async () => {
    const phoneNumer = '5549998093075'
    const text = `${new Date().getTime()}`
    const remotePhoneNumber = `${new Date().getTime()}`
    const remoteJid = `${remotePhoneNumber}@s.whatsapp.net`
    const link = `${text}.pdf`
    const id = `wa.${new Date().getTime()}`
    const pushName = `Jhon ${new Date().getTime()}`
    const messageTimestamp = Math.floor(new Date().getTime() / 100).toString()
    const mimetype = 'application/pdf'
    const fileSha256 = `fileSha256 ${new Date().getTime()}`
    const filename = `${id}.pdf`
    const input = {
      key: {
        remoteJid,
        fromMe: false,
        id,
      },
      message: {
        audioMessage: {
          fileSha256,
          caption: text,
          url: link,
          mimetype,
        },
      },
      pushName,
      messageTimestamp,
    }
    const output = {
      object: 'whatsapp_business_account',
      entry: [
        {
          id: phoneNumer,
          changes: [
            {
              value: {
                messaging_product: 'whatsapp',
                metadata: { display_phone_number: phoneNumer, phone_number_id: phoneNumer },
                messages: [
                  {
                    from: remotePhoneNumber,
                    id,
                    timestamp: messageTimestamp,
                    audio: {
                      caption: text,
                      mime_type: mimetype,
                      id: `${phoneNumer}/${id}`,
                      sha256: fileSha256,
                      url: link,
                      filename,
                    },
                    type: 'audio',
                  },
                ],
                contacts: [{ profile: { name: pushName }, wa_id: remotePhoneNumber }],
                statuses: [],
                errors: [],
              },
              field: 'messages',
            },
          ],
        },
      ],
    }
    expect(fromBaileysMessageContent(phoneNumer, input)).toEqual(output)
  })

  test('fromBaileysMessageContent with contact', async () => {
    const phoneNumer = '5549998093075'
    const remotePhoneNumber = '+11115551212'
    const remoteJid = `${remotePhoneNumber}@s.whatsapp.net`
    const id = `wa.${new Date().getTime()}`
    const pushName = `Forrest Gump ${new Date().getTime()}`
    const messageTimestamp = Math.floor(new Date().getTime() / 1000).toString()
    const input = {
      key: {
        remoteJid,
        fromMe: false,
        id,
      },
      message: {
        contactMessage: {
          vcard: `BEGIN:VCARD\nVERSION:4.0\nN:Einstein\nFN:${pushName}\nTEL:${remotePhoneNumber}\nEND:VCARD`,
        },
      },
      pushName,
      messageTimestamp,
    }
    const output = {
      object: 'whatsapp_business_account',
      entry: [
        {
          id: phoneNumer,
          changes: [
            {
              value: {
                messaging_product: 'whatsapp',
                metadata: { display_phone_number: phoneNumer, phone_number_id: phoneNumer },
                contacts: [{ profile: { name: pushName }, wa_id: remotePhoneNumber.replace('+', '') }],
                messages: [
                  {
                    from: remotePhoneNumber.replace('+', ''),
                    id,
                    timestamp: messageTimestamp,
                    contacts: [
                      {
                        name: {
                          formatted_name: pushName,
                        },
                        phones: [
                          {
                            phone: remotePhoneNumber,
                          },
                        ],
                      },
                    ],
                    type: 'contacts',
                  },
                ],
                statuses: [],
                errors: [],
              },
              field: 'messages',
            },
          ],
        },
      ],
    }
    expect(fromBaileysMessageContent(phoneNumer, input)).toEqual(output)
  })

  test('fromBaileysMessageContent with update', async () => {
    const phoneNumer = '5549998093075'
    const remotePhoneNumber = '+11115551212'
    const remoteJid = `${remotePhoneNumber}@s.whatsapp.net`
    const id = `wa.${new Date().getTime()}`
    const pushName = `Forrest Gump ${new Date().getTime()}`
    const messageTimestamp = Math.floor(new Date().getTime() / 1000).toString()
    const input = {
      key: {
        remoteJid,
        fromMe: false,
        id,
      },
      update: {
        status: 2,
      },
      pushName,
      messageTimestamp,
    }
    const output = {
      object: 'whatsapp_business_account',
      entry: [
        {
          id: phoneNumer,
          changes: [
            {
              value: {
                messaging_product: 'whatsapp',
                metadata: { display_phone_number: phoneNumer, phone_number_id: phoneNumer },
                contacts: [{ profile: { name: pushName }, wa_id: remotePhoneNumber.replace('+', '') }],
                statuses: [
                  {
                    conversation: {
                      // expiration_timestamp: 1681504976647,
                      id: remoteJid,
                    },
                    id,
                    recipient_id: remotePhoneNumber.replace('+', ''),
                    status: 'sent',
                    timestamp: messageTimestamp,
                  },
                ],
                messages: [],
                errors: [],
              },
              field: 'messages',
            },
          ],
        },
      ],
    }
    expect(fromBaileysMessageContent(phoneNumer, input)).toEqual(output)
  })

  test('fromBaileysMessageContent with status pending', async () => {
    const phoneNumer = '5549998093075'
    const remotePhoneNumber = '+11115551212'
    const remoteJid = `${remotePhoneNumber}@s.whatsapp.net`
    const id = `wa.${new Date().getTime()}`
    const pushName = `Forrest Gump ${new Date().getTime()}`
    const messageTimestamp = Math.floor(new Date().getTime() / 1000).toString()
    const body = `${new Date().getTime()}`
    const input = {
      key: {
        remoteJid,
        fromMe: false,
        id,
      },
      message: {
        extendedTextMessage: {
          text: body,
        },
      },
      messageTimestamp,
      pushName,
      status: 'PENDING',
    }
    const output = {
      object: 'whatsapp_business_account',
      entry: [
        {
          id: phoneNumer,
          changes: [
            {
              value: {
                messaging_product: 'whatsapp',
                metadata: { display_phone_number: phoneNumer, phone_number_id: phoneNumer },
                contacts: [{ profile: { name: pushName }, wa_id: remotePhoneNumber.replace('+', '') }],
                statuses: [
                  {
                    conversation: {
                      // expiration_timestamp: 1681504976647,
                      id: remoteJid,
                    },
                    id,
                    recipient_id: remotePhoneNumber.replace('+', ''),
                    status: 'sent',
                    timestamp: messageTimestamp,
                  },
                ],
                messages: [],
                errors: [],
              },
              field: 'messages',
            },
          ],
        },
      ],
    }
    expect(fromBaileysMessageContent(phoneNumer, input)).toEqual(output)
  })

  test('fromBaileysMessageContent with deleted', async () => {
    const phoneNumer = '5549998093075'
    const remotePhoneNumber = '+11115551212'
    const remoteJid = `${remotePhoneNumber}@s.whatsapp.net`
    const id = `wa.${new Date().getTime()}`
    const pushName = `Peter ${new Date().getTime()}`
    const messageTimestamp = Math.floor(new Date().getTime() / 1000).toString()
    const input = {
      key: {
        remoteJid,
        fromMe: false,
        id,
      },
      update: {
        messageStubType: 1,
      },
      pushName,
      messageTimestamp,
    }
    const output = {
      object: 'whatsapp_business_account',
      entry: [
        {
          id: phoneNumer,
          changes: [
            {
              value: {
                messaging_product: 'whatsapp',
                metadata: { display_phone_number: phoneNumer, phone_number_id: phoneNumer },
                contacts: [{ profile: { name: pushName }, wa_id: remotePhoneNumber.replace('+', '') }],
                statuses: [
                  {
                    conversation: {
                      id: remoteJid,
                      // expiration_timestamp: new Date().setDate(new Date().getDate() + 30),
                    },
                    id,
                    recipient_id: remotePhoneNumber.replace('+', ''),
                    status: 'deleted',
                    timestamp: messageTimestamp,
                  },
                ],
                messages: [],
                errors: [],
              },
              field: 'messages',
            },
          ],
        },
      ],
    }
    expect(fromBaileysMessageContent(phoneNumer, input)).toEqual(output)
  })

  test('fromBaileysMessageContent with starred', async () => {
    const phoneNumer = '5549998093075'
    const remotePhoneNumber = '+11115551212'
    const remoteJid = `${remotePhoneNumber}@s.whatsapp.net`
    const id = `wa.${new Date().getTime()}`
    const pushName = `Forrest Gump ${new Date().getTime()}`
    const messageTimestamp = Math.floor(new Date().getTime() / 1000).toString()
    const input = {
      key: {
        remoteJid,
        fromMe: false,
        id,
      },
      update: {
        starred: true,
      },
      pushName,
      messageTimestamp,
    }
    const output = {
      object: 'whatsapp_business_account',
      entry: [
        {
          id: phoneNumer,
          changes: [
            {
              value: {
                messaging_product: 'whatsapp',
                metadata: { display_phone_number: phoneNumer, phone_number_id: phoneNumer },
                contacts: [{ profile: { name: pushName }, wa_id: remotePhoneNumber.replace('+', '') }],
                statuses: [
                  {
                    conversation: {
                      id: remoteJid,
                      // expiration_timestamp: new Date().setDate(new Date().getDate() + 30),
                    },
                    id,
                    recipient_id: remotePhoneNumber.replace('+', ''),
                    status: 'read',
                    timestamp: messageTimestamp,
                  },
                ],
                messages: [],
                errors: [],
              },
              field: 'messages',
            },
          ],
        },
      ],
    }
    expect(fromBaileysMessageContent(phoneNumer, input)).toEqual(output)
  })

  test('fromBaileysMessageContent with failed', async () => {
    const phoneNumer = '5549998093075'
    const remotePhoneNumber = '+11115551212'
    const remoteJid = `${remotePhoneNumber}@s.whatsapp.net`
    const id = `wa.${new Date().getTime()}`
    const pushName = `Forrest Gump ${new Date().getTime()}`
    const messageTimestamp = Math.floor(new Date().getTime() / 1000).toString()
    const input = {
      key: {
        remoteJid,
        fromMe: false,
        id,
      },
      update: {
        status: 'ERROR',
      },
      pushName,
      messageTimestamp,
    }
    const output = {
      object: 'whatsapp_business_account',
      entry: [
        {
          id: phoneNumer,
          changes: [
            {
              value: {
                messaging_product: 'whatsapp',
                metadata: { display_phone_number: phoneNumer, phone_number_id: phoneNumer },
                contacts: [{ profile: { name: pushName }, wa_id: remotePhoneNumber.replace('+', '') }],
                statuses: [
                  {
                    conversation: {
                      id: remoteJid,
                      // expiration_timestamp: new Date().setDate(new Date().getDate() + 30),
                    },
                    errors: [
                      {
                        code: 1,
                        title: 'The Unoapi Cloud has a error, verify the logs',
                      },
                    ],
                    id,
                    recipient_id: remotePhoneNumber.replace('+', ''),
                    status: 'failed',
                    timestamp: messageTimestamp,
                  },
                ],
                messages: [],
                errors: [],
              },
              field: 'messages',
            },
          ],
        },
      ],
    }
    expect(fromBaileysMessageContent(phoneNumer, input)).toEqual(output)
  })

  test('fromBaileysMessageContent with receipt read', async () => {
    const phoneNumer = '5549998093075'
    const remotePhoneNumber = '+11115551212'
    const remoteJid = `${remotePhoneNumber}@s.whatsapp.net`
    const id = `wa.${new Date().getTime()}`
    const pushName = `Forrest Gump ${new Date().getTime()}`
    const messageTimestamp = Math.floor(new Date().getTime() / 1000).toString()
    const input = {
      key: {
        remoteJid,
        fromMe: false,
        id,
      },
      receipt: {
        readTimestamp: messageTimestamp,
      },
      pushName,
      messageTimestamp,
    }
    const output = {
      object: 'whatsapp_business_account',
      entry: [
        {
          id: phoneNumer,
          changes: [
            {
              value: {
                messaging_product: 'whatsapp',
                metadata: { display_phone_number: phoneNumer, phone_number_id: phoneNumer },
                contacts: [{ profile: { name: pushName }, wa_id: remotePhoneNumber.replace('+', '') }],
                statuses: [
                  {
                    conversation: {
                      id: remoteJid,
                      // expiration_timestamp: new Date().setDate(new Date().getDate() + 30),
                    },
                    id,
                    recipient_id: remotePhoneNumber.replace('+', ''),
                    status: 'read',
                    timestamp: messageTimestamp,
                  },
                ],
                messages: [],
                errors: [],
              },
              field: 'messages',
            },
          ],
        },
      ],
    }
    expect(fromBaileysMessageContent(phoneNumer, input)).toEqual(output)
  })

  test('fromBaileysMessageContent with receipt read', async () => {
    const phoneNumer = '5549998093075'
    const remotePhoneNumber = '+11115551212'
    const remoteJid = `${remotePhoneNumber}@s.whatsapp.net`
    const id = `wa.${new Date().getTime()}`
    const pushName = `Patricia ${new Date().getTime()}`
    const messageTimestamp = Math.floor(new Date().getTime() / 1000).toString()
    const input = {
      key: {
        remoteJid,
        fromMe: false,
        id,
      },
      receipt: {
        receiptTimestamp: messageTimestamp,
      },
      pushName,
      messageTimestamp,
    }
    const output = {
      object: 'whatsapp_business_account',
      entry: [
        {
          id: phoneNumer,
          changes: [
            {
              value: {
                messaging_product: 'whatsapp',
                metadata: { display_phone_number: phoneNumer, phone_number_id: phoneNumer },
                contacts: [{ profile: { name: pushName }, wa_id: remotePhoneNumber.replace('+', '') }],
                statuses: [
                  {
                    conversation: {
                      id: remoteJid,
                      // expiration_timestamp: new Date().setDate(new Date().getDate() + 30),
                    },
                    id,
                    recipient_id: remotePhoneNumber.replace('+', ''),
                    status: 'delivered',
                    timestamp: messageTimestamp,
                  },
                ],
                messages: [],
                errors: [],
              },
              field: 'messages',
            },
          ],
        },
      ],
    }
    expect(fromBaileysMessageContent(phoneNumer, input)).toEqual(output)
  })

  test('getMessageType with viewOnceMessage', async () => {
    const input = {
      key: {
        remoteJid: '554988290955@s.whatsapp.net',
        fromMe: true,
        id: '3AB1588C3CED95961092',
        participant: undefined,
      },
      messageTimestamp: 1677774582,
      pushName: 'Clairton Rodrigo Heinzen',
      message: {
        protocolMessage: {
          type: 5,
          historySyncNotification: [],
        },
        messageContextInfo: {
          deviceListMetadata: [],
          deviceListMetadataVersion: 2,
        },
      },
    }
    expect(getMessageType(input)).toEqual('protocolMessage')
  })

  test('getMessageType with viewOnceMessage', async () => {
    const input = {
      message: {
        viewOnceMessage: {},
      },
    }
    expect(getMessageType(input)).toEqual('viewOnceMessage')
  })

  test('toBaileysMessageContent text', async () => {
    const body = `ladiuad87hodlnkd ${new Date().getTime()} askpdasioashfjh`
    const input = {
      type: 'text',
      text: {
        body,
      },
    }
    const output = {
      text: body,
    }
    expect(toBaileysMessageContent(input)).toEqual(output)
  })

  test('toBaileysMessageContent media', async () => {
    const body = `ladiuad87hodlnkd ${new Date().getTime()} askpdasioashfjh`
    const text = `${new Date().getTime()}`
    const link = `${text}.pdf`
    const mimetype = 'application/pdf'
    const input = {
      type: 'video',
      video: {
        caption: body,
        link,
      },
    }
    const output = {
      caption: body,
      mimetype,
      video: {
        url: link,
      },
    }
    expect(toBaileysMessageContent(input)).toEqual(output)
  })

  test('toBaileysMessageContent unknown', async () => {
    const input = {
      type: 'unknown',
    }
    try {
      toBaileysMessageContent(input)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (e: any) {
      expect(e.message).toBe(`Unknow message type unknown`)
    }
  })

  test('fromBaileysMessageContent Invalid PreKey ID', async () => {
    const phoneNumer = '5549998093075'
    const remotePhoneNumber = '+11115551212'
    const remoteJid = `${remotePhoneNumber}@s.whatsapp.net`
    const id = `wa.${new Date().getTime()}`
    const pushName = `Fernanda ${new Date().getTime()}`
    const messageTimestamp = Math.floor(new Date().getTime() / 1000).toString()
    const input = {
      key: {
        remoteJid: remoteJid,
        fromMe: false,
        id: id,
      },
      messageTimestamp,
      pushName,
      messageStubType: 2,
      messageStubParameters: ['Invalid PreKey ID'],
    }
    const body = '🕒 Não foi possível ler a mensagem. Peça para enviar novamente ou abra o Whatsapp no celular.'
    const output = {
      object: 'whatsapp_business_account',
      entry: [
        {
          id: phoneNumer,
          changes: [
            {
              value: {
                messaging_product: 'whatsapp',
                metadata: { display_phone_number: phoneNumer, phone_number_id: phoneNumer },
                contacts: [{ profile: { name: pushName }, wa_id: remotePhoneNumber.replace('+', '') }],
                statuses: [],
                messages: [
                  {
                    from: remotePhoneNumber.replace('+', ''),
                    id,
                    timestamp: messageTimestamp,
                    text: { body },
                    type: 'text',
                  },
                ],
                errors: [],
              },
              field: 'messages',
            },
          ],
        },
      ],
    }
    try {
      fromBaileysMessageContent(phoneNumer, input)
    } catch (error) {
      if (error instanceof DecryptError) {
        expect(error.getContent()).toEqual(output)
      } else {
        throw error
      }
    }
  })

  test('isValidPhoneNumber return false when 8 digits phone brazilian', async () => {
    expect(isValidPhoneNumber('554988290955')).toEqual(false)
  })

  test('isValidPhoneNumber return true when 9 digits phone brazilian', async () => {
    expect(isValidPhoneNumber('5549988290955')).toEqual(true)
  })

  test('isValidPhoneNumber return false when + without 9 digit', async () => {
    expect(isValidPhoneNumber('+554988290955')).toEqual(false)
  })

  test('isValidPhoneNumber return true when + fixed line brazilian', async () => {
    expect(isValidPhoneNumber('+554936213155', true)).toEqual(true)
  })

  test('isValidPhoneNumber return true when internacional valid', async () => {
    expect(isValidPhoneNumber('+595985523065')).toEqual(true)
  })

  test('isValidPhoneNumber return false when invalid', async () => {
    expect(isValidPhoneNumber('+554998416834X')).toEqual(false)
  })

  test('getNormalizedMessage documentWithCaptionMessage', async () => {
    const output = {
      key,
      message: { documentMessage },
    }
    expect(getNormalizedMessage(inputDocumentWithCaptionMessage)).toEqual(output)
  })

  test('isSaveMedia documentWithCaptionMessage', async () => {
    expect(isSaveMedia(inputDocumentWithCaptionMessage)).toEqual(true)
  })

  test('isSaveMedia documentMessage', async () => {
    expect(isSaveMedia(inputDocumentMessage)).toEqual(true)
  })

  test('toBaileysMessageContent interactive', async () => {
    const input = {
      type: 'interactive',
      interactive: {
        type: 'list',
        header: {
          type: 'text',
          text: 'Title',
        },
        body: {
          text: 'your-text-message-content',
        },
        footer: {
          text: 'Cloud UnoApi',
        },
        action: {
          button: 'sections',
          sections: [
            {
              title: 'your-section-title-content',
              rows: [
                {
                  id: 'unique-row-identifier',
                  title: 'row-title-content',
                  description: 'row-description-content',
                },
              ],
            },
            {
              title: 'your-section-title-content',
              rows: [
                {
                  id: 'unique-row-identifier',
                  title: 'row-title-content',
                  description: 'row-description-content',
                },
              ],
            },
          ],
        },
      },
    }
    const output = {
      listMessage: {
        buttonText: 'sections',
        description: 'your-text-message-content',
        footerText: 'Cloud UnoApi',
        listType: 1,
        sections: [
          {
            rows: [
              {
                description: 'row-description-content',
                rowId: undefined,
                title: 'row-title-content',
              },
            ],
            title: 'your-section-title-content',
          },
          {
            rows: [
              {
                description: 'row-description-content',
                rowId: undefined,
                title: 'row-title-content',
              },
            ],
            title: 'your-section-title-content',
          },
        ],
        title: 'Title',
      },
    }
    expect(toBaileysMessageContent(input)).toEqual(output)
  })
})
