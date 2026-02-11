import { WAMessage, proto } from 'baileys'
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
  extractDestinyPhone,
  isGroupMessage,
  isOutgoingMessage,
  getChatAndNumberAndId,
  isDecryptError,
  isBindTemplateError,
  BindTemplateError,
  extractFromPhone,
  extractTypeMessage,
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
  test('return y extractDestinyPhone from webhook payload message', async () => {
    const payload = {
      entry: [
        {
          changes: [
            {
              value: {
                contacts: [{ wa_id: 'y' }],
              },
            },
          ],
        },
      ],
    }
    expect(extractDestinyPhone(payload)).toBe('y')
  })

  test('return y extractDestinyPhone from webhook payload message with message_echoes', async () => {
    const payload = {
      entry: [
        {
          changes: [
            {
              value: {
                message_echoes: [{ to: 'y' }],
              },
            },
          ],
        },
      ],
    }
    expect(extractDestinyPhone(payload)).toBe('y')
  })

  test('return y extractFromPhone from webhook payload message with message_echoes', async () => {
    const payload = {
      entry: [
        {
          changes: [
            {
              value: {
                message_echoes: [{ from: 'y' }],
              },
            },
          ],
        },
      ],
    }
    expect(extractFromPhone(payload)).toBe('y')
  })

  test('return y extractFromPhone from webhook payload message with messages', async () => {
    const payload = {
      entry: [
        {
          changes: [
            {
              value: {
                messages: [{ from: 'y' }],
              },
            },
          ],
        },
      ],
    }
    expect(extractFromPhone(payload)).toBe('y')
  })

  test('return y extractTypeMessage with message_echoes', async () => {
    const payload = {
      entry: [
        {
          changes: [
            {
              value: {
                message_echoes: [{ type: 'y' }],
              },
            },
          ],
        },
      ],
    }
    expect(extractTypeMessage(payload)).toBe('y')
  })

  test('return y extractTypeMessage with messages', async () => {
    const payload = {
      entry: [
        {
          changes: [
            {
              value: {
                messages: [{ type: 'y' }],
              },
            },
          ],
        },
      ],
    }
    expect(extractTypeMessage(payload)).toBe('y')
  })

  test('isDecryptError true', async () => {
    expect(isDecryptError(new DecryptError({}, 1))).toBe(true)
  })

  test('isDecryptError false', async () => {
    expect(isDecryptError(new Error())).toBe(false)
  })

  test('isBindTemplateError false', async () => {
    expect(isBindTemplateError(new Error())).toBe(false)
  })

  test('isBindTemplateError true', async () => {
    expect(isBindTemplateError(new BindTemplateError())).toBe(true)
  })

  test('return x extractDestinyPhone from webhook payload status', async () => {
    const payload = {
      entry: [
        {
          changes: [
            {
              value: {
                statuses: [{ recipient_id: 'x' }],
              },
            },
          ],
        },
      ],
    }
    expect(extractDestinyPhone(payload)).toBe('x')
  })

  test('return isGroupMessage false with status', async () => {
    const payload = {
      entry: [
        {
          changes: [
            {
              value: {
                statuses: [{ recipient_id: 'x' }],
              },
            },
          ],
        },
      ],
    }
    expect(isGroupMessage(payload)).toBe(false)
  })

  test('return isGroupMessage false with non group', async () => {
    const payload = {
      entry: [
        {
          changes: [
            {
              value: {
                contacts: [{ wa_id: 'y' }],
              },
            },
          ],
        },
      ],
    }
    expect(isGroupMessage(payload)).toBe(false)
  })

  test('getChatAndNumberAndId with jid and :', async () => {
    const remoteJid = '554988290955@s.whatsapp.net'
    const payload = { key: { remoteJid: '554988290955:25@s.whatsapp.net' } }
    const a = getChatAndNumberAndId(payload)
    expect(a[0]).toBe(remoteJid)
    expect(a[1]).toBe('5549988290955')
    expect(a[2]).toBe(remoteJid)
  })

  test('getChatAndNumberAndId with lid and without group', async () => {
    const senderPn = '554988290955'
    const remoteJid = '24788516941@lid'
    const payload = { key: { remoteJid, senderPn } }
    const a = getChatAndNumberAndId(payload)
    expect(a[0]).toBe(remoteJid)
    expect(a[1]).toBe('5549988290955')
    expect(a[2]).toBe(remoteJid)
  })

  test('getChatAndNumberAndId with participant and and with group', async () => {
    const participantPn = '554988290955'
    const remoteJid = '24788516941@g.us'
    const participant = '554988290955@s.whatsapp.net'
    const payload = { key: { remoteJid, participant, participantPn } }
    const a = getChatAndNumberAndId(payload)
    expect(a[0]).toBe(remoteJid)
    expect(a[1]).toBe('5549988290955')
    expect(a[2]).toBe(participant)
  })

  test('getChatAndNumberAndId with lid and with group', async () => {
    const participantPn = '554988290955'
    const remoteJid = '24788516941@g.us'
    const participantLid = '24788516941@lid'
    const payload = { key: { remoteJid, participantLid, participantPn } }
    const a = getChatAndNumberAndId(payload)
    expect(a[0]).toBe(remoteJid)
    expect(a[1]).toBe('5549988290955')
    expect(a[2]).toBe(participantLid)
  })

  test('getChatAndNumberAndId with senderLid and without group', async () => {
    const senderPn = '554988290955'
    const remoteJid = '24788516941@lid'
    const payload = { key: { remoteJid, senderLid: remoteJid, senderPn } }
    const a = getChatAndNumberAndId(payload)
    expect(a[0]).toBe(remoteJid)
    expect(a[1]).toBe('5549988290955')
    expect(a[2]).toBe(remoteJid)
  })

  test('return isGroupMessage true', async () => {
    const payload = {
      entry: [
        {
          changes: [
            {
              value: {
                contacts: [{ group_id: 'y' }],
              },
            },
          ],
        },
      ],
    }
    expect(isGroupMessage(payload)).toBe(true)
  })

  test('return isOutgoingMessage true', async () => {
    const number = `${new Date().getTime()}`
    const payload = {
      entry: [
        {
          changes: [
            {
              value: {
                metadata: {
                  display_phone_number: `+${number}`,
                },
                messages: [{ from: number }],
              },
            },
          ],
        },
      ],
    }
    expect(isOutgoingMessage(payload)).toBe(true)
  })

  test('return empty extractDestinyPhone from api payload', async () => {
    expect(extractDestinyPhone({ to: 'y' })).toBe('y')
  })

  test('phoneNumberToJid with nine digit', async () => {
    expect(phoneNumberToJid('+5549988290955')).toEqual('5549988290955@s.whatsapp.net')
  })

  test('phoneNumberToJid with nine digit 33008196', async () => {
    expect(phoneNumberToJid('+5549933008196')).toEqual('5549933008196@s.whatsapp.net')
  })

  test('phoneNumberToJid', async () => {
    expect(phoneNumberToJid('+554988290955')).toEqual('5549988290955@s.whatsapp.net')
  })

  test('phoneNumberToJid with 13 length', async () => {
    expect(phoneNumberToJid('+5549800000000')).toEqual('5549800000000@s.whatsapp.net')
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

  test('fromBaileysMessageContent config outgoingMessagesCoex', async () => {
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
        fromMe: true,
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
          id: remoteJid,
          changes: [
            {
              value: {
                messaging_product: 'whatsapp',
                metadata: { display_phone_number: phoneNumer, phone_number_id: phoneNumer },
                message_echoes: [
                  {
                    to: '5549988290955',
                    from: phoneNumer,
                    id,
                    timestamp: messageTimestamp,
                    text: { body },
                    type: 'text',
                  },
                ],
                statuses: [],
                errors: [],
              },
              field: 'smb_message_echoes',
            },
          ],
        },
      ],
    }
    expect(fromBaileysMessageContent(phoneNumer, input, { outgoingMessagesCoex: true })[0]).toEqual(output)
  })

  test('fromBaileysMessageContent with editedMessage for imageMessage', async () => {
    const phoneNumer = '5549998360838'
    const remotePhoneNumer = '5549988290955'
    const remoteJid = `${remotePhoneNumer}@s.whatsapp.net`
    const messageTimestamp = Math.floor(new Date().getTime() / 1000).toString()
    const pushName = `Mary ${new Date().getTime()}`
    const body = `${new Date().getTime()}`
    const id = `wa.${new Date().getTime()}`
    const input = {
      key: {
        remoteJid,
        fromMe: false,
        id,
      },
      message: {
        editedMessage: {
          message: {
            protocolMessage: {
              key: {
                id: '3AD0FEAAF5915DAEAA07',
              },
              type: 'MESSAGE_EDIT',
              editedMessage: {
                imageMessage: {
                  caption: body,
                },
              },
            },
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
          id: remoteJid,
          changes: [
            {
              value: {
                messaging_product: 'whatsapp',
                metadata: { display_phone_number: phoneNumer, phone_number_id: phoneNumer },
                messages: [
                  {
                    from: remotePhoneNumer,
                    id,
                    timestamp: messageTimestamp,
                    text: { body },
                    type: 'text',
                  },
                ],
                contacts: [{ profile: { name: pushName, picture: undefined }, wa_id: remotePhoneNumer }],
                statuses: [],
                errors: [],
              },
              field: 'messages',
            },
          ],
        },
      ],
    }
    expect(fromBaileysMessageContent(phoneNumer, input)[0]).toEqual(output)
  })

  test('fromBaileysMessageContent with pix key', async () => {
    const phoneNumer = '5549998360838'
    const remotePhoneNumer = '554988290955'
    const remoteJid = `${remotePhoneNumer}@s.whatsapp.net`
    const key = `${new Date().getTime()}`
    const keyType = `key.${new Date().getTime()}`
    const id = `wa.${new Date().getTime()}`
    const merchantName = `Mary ${new Date().getTime()}`
    const messageTimestamp = Math.floor(new Date().getTime() / 1000).toString()
    const body = `*${merchantName}*\nChave PIX tipo *${keyType}*: ${key}`
    const input = {
      key: {
        remoteJid, fromMe: false, id
      },
      message: {
        interactiveMessage: {
          nativeFlowMessage: {
            buttons: [
              {
                buttonParamsJson: JSON.stringify({
                  payment_settings: [
                    {
                      type:'pix_static_code',
                      pix_static_code: {
                        merchant_name: merchantName,
                        key,
                        key_type: keyType
                      }
                    }
                  ]
                })
              }
            ]
          }
        }
      },
      pushName: merchantName,
      messageTimestamp,
    }
    const output = {
      object: 'whatsapp_business_account',
      entry: [
        {
          id: remoteJid,
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
                contacts: [{ profile: { name: merchantName, picture: undefined }, wa_id: '5549988290955' }],
                statuses: [],
                errors: [],
              },
              field: 'messages',
            },
          ],
        },
      ],
    }
    expect(fromBaileysMessageContent(phoneNumer, input)[0]).toEqual(output)
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
          id: remoteJid,
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
    expect(fromBaileysMessageContent(phoneNumer, input)[0]).toEqual(output)
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
          id: remoteJid,
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
    expect(fromBaileysMessageContent(phoneNumer, input)[0]).toEqual(output)
  })

  test('fromBaileysMessageContent with media', async () => {
    const phoneNumer = '5549998093075'
    const text = `${new Date().getTime()}`
    const remotePhoneNumber = `${new Date().getTime()}`
    const remoteJid = `${remotePhoneNumber}@s.whatsapp.net`
    const link = `http://localhost/${text}.pdf`
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
          id: remoteJid,
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
    expect(fromBaileysMessageContent(phoneNumer, input)[0]).toEqual(output)
  })

  test('fromBaileysMessageContent with contactsArrayMessage', async () => {
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
        contactsArrayMessage: {
          displayName: `${pushName} contatos`,
          contacts: [
            {
              displayName: pushName,
              vcard: `BEGIN:VCARD\nVERSION:4.0\nN:Einstein\nFN:${pushName}\nEND:VCARD`,
            },
          ],
        },
      },
      pushName,
      messageTimestamp,
    }
    const output = {
      object: 'whatsapp_business_account',
      entry: [
        {
          id: remoteJid,
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
                    contacts: [],
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
    expect(fromBaileysMessageContent(phoneNumer, input)[0]).toEqual(output)
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
          id: remoteJid,
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
    expect(fromBaileysMessageContent(phoneNumer, input)[0]).toEqual(output)
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
          id: remoteJid,
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
    expect(fromBaileysMessageContent(phoneNumer, input)[0]).toEqual(output)
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
          id: remoteJid,
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
    expect(fromBaileysMessageContent(phoneNumer, input)[0]).toEqual(output)
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
          id: remoteJid,
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
    expect(fromBaileysMessageContent(phoneNumer, input)[0]).toEqual(output)
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
          id: remoteJid,
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
    expect(fromBaileysMessageContent(phoneNumer, input)[0]).toEqual(output)
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
          id: remoteJid,
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
    expect(fromBaileysMessageContent(phoneNumer, input)[0]).toEqual(output)
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
          id: remoteJid,
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
    expect(fromBaileysMessageContent(phoneNumer, input)[0]).toEqual(output)
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
          id: remoteJid,
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
    expect(fromBaileysMessageContent(phoneNumer, input)[0]).toEqual(output)
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

  test('fromBaileysMessageContent with self in group return chatId and group_id', async () => {
    const phoneNumer = '554988290955'
    const participant = `${phoneNumer}@s.whatsapp.net`
    const remoteJid = `${new Date().getTime()}@g.us`
    const id = `wa.${new Date().getTime()}`
    const input = {
      key: {
        remoteJid,
        fromMe: true,
        id,
        participant,
      },
      status: 2,
      message: {
        conversation: 'não está funcionando, quer acessar meu computador',
      },
      verifiedBizName: '',
    }
    const resp = fromBaileysMessageContent('5549988290955', input)
    expect(resp[3]).toBe(remoteJid)
    expect(resp[0].entry[0].changes[0].value.contacts[0].group_id).toBe(remoteJid)
  })

  test('fromBaileysMessageContent without protocolMessage editedMessage', async () => {
    const remotePhoneNumber = '+11115551212'
    const remoteJid = `${remotePhoneNumber}@s.whatsapp.net`
    const id = `wa.${new Date().getTime()}`
    const pushName = `Fernanda ${new Date().getTime()}`
    const messageTimestamp = Math.floor(new Date().getTime() / 1000).toString()
    const phoneNumer = '5549998093075'
    const conversation = `blablabla2.${new Date().getTime()}`
    const input = {
      key: {
        remoteJid,
        fromMe: false,
        id,
      },
      messageTimestamp,
      pushName,
      message: {
        editedMessage: {
          message: {
            conversation,
          },
        },
      },
    }
    const output = {
      object: 'whatsapp_business_account',
      entry: [
        {
          id: remoteJid,
          changes: [
            {
              value: {
                messaging_product: 'whatsapp',
                metadata: { display_phone_number: phoneNumer, phone_number_id: phoneNumer },
                contacts: [{ profile: { name: pushName, picture: undefined }, wa_id: remotePhoneNumber.replace('+', '') }],
                statuses: [],
                messages: [
                  {
                    from: remotePhoneNumber.replace('+', ''),
                    id,
                    timestamp: messageTimestamp,
                    text: { body: conversation },
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
    expect(fromBaileysMessageContent(phoneNumer, input)[0]).toEqual(output)
  })

  test('fromBaileysMessageContent protocolMessage editedMessage', async () => {
    const remotePhoneNumber = '11115551212'
    const remoteJid = `${remotePhoneNumber}@s.whatsapp.net`
    const id = `wa.${new Date().getTime()}`
    const id2 = `wa.${new Date().getTime()}`
    const pushName = `Fernanda ${new Date().getTime()}`
    const messageTimestamp = Math.floor(new Date().getTime() / 1000).toString()
    const phoneNumer = '5549998093075'
    const conversation = `blablabla2.${new Date().getTime()}`
    const input = {
      key: {
        remoteJid: remoteJid,
        fromMe: true,
        id: id,
      },
      messageTimestamp,
      pushName,
      message: {
        protocolMessage: {
          key: {
            remoteJid,
            fromMe: true,
            id: id2,
          },
          type: 'MESSAGE_EDIT',
          editedMessage: {
            conversation,
          },
        },
      },
    }
    const output = {
      object: 'whatsapp_business_account',
      entry: [
        {
          id: remoteJid,
          changes: [
            {
              value: {
                messaging_product: 'whatsapp',
                metadata: { display_phone_number: phoneNumer, phone_number_id: phoneNumer },
                contacts: [{ profile: { name: remotePhoneNumber, picture: undefined }, wa_id: remotePhoneNumber.replace('+', '') }],
                statuses: [],
                messages: [
                  {
                    from: phoneNumer.replace('+', ''),
                    id,
                    timestamp: messageTimestamp,
                    text: { body: conversation },
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
    expect(fromBaileysMessageContent(phoneNumer, input)[0]).toEqual(output)
  })

  test('getMessageType with viewOnceMessage', async () => {
    const input = {
      message: {
        protocolMessage: {},
        type: 'MESSAGE_EDIT',
        editedMessage: {
          conversation: 'blablabla2',
        },
      },
    }
    expect(getMessageType(input)).toEqual('editedMessage')
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

  test('toBaileysMessageContent contacts', async () => {
    const displayName = 'abc' + new Date().getTime()
    const phone = new Date().getTime()
    const wa_id = new Date().getTime()
    const input = {
      type: 'contacts',
      contacts: [
        {
          name: { formatted_name: displayName },
          phones: [{ phone, wa_id }],
        },
      ],
    }
    const vcard = 'BEGIN:VCARD\n' + 'VERSION:3.0\n' + `N:${displayName}\n` + `TEL;type=CELL;type=VOICE;waid=${wa_id}:${phone}\n` + 'END:VCARD'
    const output = { contacts: { displayName, contacts: [{ vcard }] } }
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
    const body = '🕒 The message could not be read. Please ask to send it again or open WhatsApp on your phone.'
    const output = {
      object: 'whatsapp_business_account',
      entry: [
        {
          id: remoteJid,
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
      buttonText: 'sections',
      // description: 'your-text-message-content',
      footer: 'Cloud UnoApi',
      // listType: 2,
      sections: [
        {
          rows: [
            {
              description: 'row-description-content',
              rowId: 'unique-row-identifier',
              title: 'row-title-content',
            },
          ],
          title: 'your-section-title-content',
        },
        {
          rows: [
            {
              description: 'row-description-content',
              rowId: 'unique-row-identifier',
              title: 'row-title-content',
            },
          ],
          title: 'your-section-title-content',
        },
      ],
      // title: 'your-text-message-content',
      "text": "your-text-message-content",
      "title": "Title"
    }
    const result = toBaileysMessageContent(input)
    expect(result).toEqual(output)
  })

  test('fromBaileysMessageContent participant outside key', async () => {
    const phoneNumer = '5549998093075'
    const remotePhoneNumber = '11115551212'
    const input = {
      key: {
        remoteJid: '554988189915-1593526912@g.us',
        fromMe: false,
        id: '583871ED40A7FBC09B5C3A7C2CC760A0',
      },
      message: {
        conversation: '🤷‍♂️',
      },
      participant: `${remotePhoneNumber}@s.whatsapp.net`,
      isMentionedInStatus: false,
    }
    const resp = fromBaileysMessageContent(phoneNumer, input)[0]
    const from = resp.entry[0].changes[0].value.messages[0].from
    expect(from).toEqual(remotePhoneNumber)
  })

  test('fromBaileysMessageContent group with groupMessagesCloudFormat', async () => {
    const phoneNumer = '5549998093075'
    const remotePhoneNumber = '11115551212'
    const remoteJid = '554988189915-1593526912@g.us'
    const input = {
      key: {
        remoteJid,
        fromMe: false,
        id: '583871ED40A7FBC09B5C3A7C2CC760A0',
        participant: `${remotePhoneNumber}@s.whatsapp.net`,
      },
      status: 3,
      message: {
        conversation: '🤷‍♂️',
      },
    }
    const resp = fromBaileysMessageContent(phoneNumer, input, { groupMessagesCloudFormat: true })[0]
    // const from = resp.entry[0].changes[0].value.statuses[0].from
    // const groupId = resp.entry[0].changes[0].value.statuses[0].group_id
    const recipientType = resp.entry[0].changes[0].value.statuses[0].recipient_type
    // expect(from).toEqual(remotePhoneNumber)
    // expect(groupId).toEqual(remoteJid)
    expect(recipientType).toEqual('group')
  })

  test('fromBaileysMessageContent statusMentionMessage', async () => {
    const remotePhoneNumber = '11115551212'
    const remoteJid = `${remotePhoneNumber}@s.whatsapp.net`
    const id = `wa.${new Date().getTime()}`
    const body = `ladiuad87hodlnkd ${new Date().getTime()} askpdasioashfjh`
    const stanzaId = `wa.${new Date().getTime()}`
    const pushName = `Mary ${new Date().getTime()}`
    const messageTimestamp = Math.floor(new Date().getTime() / 1000).toString()
    const phoneNumer = '5549998360838'
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
            participant: remoteJid,
            quotedMessage: {
              statusMentionMessage: {
                message: {
                  protocolMessage: {
                    type: 'STATUS_MENTION_MESSAGE',
                  },
                },
              },
            },
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
          id: remoteJid,
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
                    from: remotePhoneNumber,
                    id,
                    timestamp: messageTimestamp,
                    text: { body },
                    type: 'text',
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
    expect(fromBaileysMessageContent(phoneNumer, input)[0]).toEqual(output)
  })
  // {"key":{"remoteJid":"555533800800@s.whatsapp.net","fromMe":false,"id":"1BE283407E62E5A073"},"messageTimestamp":1753900800,"pushName":"555533800800","broadcast":false,"message":{"messageContextInfo":{"deviceListMetadata":{"recipientKeyHash":"BuoOcp2GlUsdsQ==","recipientTimestamp":"1753278139","recipientKeyIndexes":[0,5]},"deviceListMetadataVersion":2},"buttonsMessage":{"contentText":"Para confirmar, estou falando com *IM Agronegócios* e o seu CNPJ é *41.281.5xx/xxxx-xx*?","buttons":[{"buttonId":"1","buttonText":{"displayText":"Sim"},"type":"RESPONSE"},{"buttonId":"2","buttonText":{"displayText":"Não"},"type":"RESPONSE"}],"headerType":"EMPTY"}},"verifiedBizName":"Unifique"}
  // {"key":{"remoteJid":"555533800800@s.whatsapp.net","fromMe":true,"id":"3EB02FCD7C12A71F06DE34"}, "messageTimestamp":1753900805,"pushName":"Im Agronegócios","broadcast":false,"status":2, "message":{"buttonsResponseMessage":{"selectedButtonId":"1","selectedDisplayText":"Sim","contextInfo":{"stanzaId":"1BE283407E62E5A073","participant":"555533800800@s.whatsapp.net","quotedMessage":{"messageContextInfo":{},"buttonsMessage":{"contentText":"Para confirmar, estou falando com *IM Agronegócios* e o seu CNPJ é *41.281.5xx/xxxx-xx*?","buttons":[{"buttonId":"1","buttonText":{"displayText":"Sim"},"type":"RESPONSE"},{"buttonId":"2","buttonText":{"displayText":"Não"},"type":"RESPONSE"}],"headerType":"EMPTY"}}},"type":"DISPLAY_TEXT"}}}

  test('fromBaileysMessageContent with templateButtonReplyMessage', async () => {
    const phoneNumer = '5549998360838'
    const remotePhoneNumer = '554988290955'
    const remoteJid = `${remotePhoneNumer}@s.whatsapp.net`
    const body = `${new Date().getTime()}`
    const id = `wa.${new Date().getTime()}`
    const stanzaId = `wa.${new Date().getTime()}`
    const pushName = `Mary ${new Date().getTime()}`
    const messageTimestamp = Math.floor(new Date().getTime() / 1000).toString()
    const input = {
      key: {
        remoteJid,
        fromMe: false,
        id,
      },
      message: {
        templateButtonReplyMessage: {
          selectedId: body,
          selectedDisplayText: body,
          contextInfo: {
            stanzaId
          }
        }
      },
      pushName,
      messageTimestamp,
    }
    const output = {
      object: 'whatsapp_business_account',
      entry: [
        {
          id: remoteJid,
          changes: [
            {
              value: {
                messaging_product: 'whatsapp',
                metadata: { display_phone_number: phoneNumer, phone_number_id: phoneNumer },
                messages: [
                  {
                    context: {
                      id: stanzaId,
                      message_id: stanzaId
                    },
                    from: '5549988290955',
                    id,
                    timestamp: messageTimestamp,
                    button: { 
                      payload: body,
                      text: body,
                    },
                    type: 'button',
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
    expect(fromBaileysMessageContent(phoneNumer, input)[0]).toEqual(output)
  })

  test('fromBaileysMessageContent with listResponseMessage', async () => {
    const phoneNumer = '5549998360838'
    const remotePhoneNumer = '554988290955'
    const remoteJid = `${remotePhoneNumer}@s.whatsapp.net`
    const stanzaId = `wa.${new Date().getTime()}`
    const title = `title ${new Date().getTime()}`
    const description = `description ${new Date().getTime()}`
    const id = `wa.${new Date().getTime()}`
    const rowId = `rowId.${new Date().getTime()}`
    const pushName = `Mary ${new Date().getTime()}`
    const messageTimestamp = Math.floor(new Date().getTime() / 1000).toString()
    const input = {
      key: {
        remoteJid,
        fromMe: false,
        id,
      },
      message: {
        listResponseMessage: {
          title, listType: 'SINGLE_SELECT', description,
          singleSelectReply: {
            selectedRowId: rowId
          },
          contextInfo: {
            stanzaId,
            quotedMessage: {
              listMessage: {
                title, description, listType: 'SINGLE_SELECT',
                sections: [
                  {
                    title,
                    rows: [
                      {
                        title, description, rowId
                      }
                    ]
                  }
                ],
              }
            }
          },
        }
      },
      pushName,
      messageTimestamp,
    }
    const output = {
      object: 'whatsapp_business_account',
      entry: [
        {
          id: remoteJid,
          changes: [
            {
              value: {
                messaging_product: 'whatsapp',
                metadata: { display_phone_number: phoneNumer, phone_number_id: phoneNumer },
                messages: [
                  {
                    context: {
                      id: stanzaId,
                      message_id: stanzaId
                    },
                    from: '5549988290955',
                    id,
                    timestamp: messageTimestamp,
                    interactive: { 
                      type: 'list_reply',
                      list_reply: { id: rowId, title, description }
                    },
                    type: 'interactive'
                  },
                ],
                contacts: [{ profile: { name: pushName, picture: undefined }, wa_id: '5549988290955' }],
                statuses: [],
                errors: []
              },
              field: 'messages'
            },
          ],
        },
      ],
    }
    expect(fromBaileysMessageContent(phoneNumer, input)[0]).toEqual(output)
  })

  test('fromBaileysMessageContent with documentWithCaptionMessage and listMessage', async () => {
    const phoneNumer = '5549998360838'
    const remotePhoneNumer = '554988290955'
    const remoteJid = `${remotePhoneNumer}@s.whatsapp.net`
    const title = `title ${new Date().getTime()}`
    const description = `description ${new Date().getTime()}`
    const buttonText = `buttonText ${new Date().getTime()}`
    const headerText = `headerText ${new Date().getTime()}`
    const footerText = `footerText ${new Date().getTime()}`
    const id = `wa.${new Date().getTime()}`
    const rowId = `rowId.${new Date().getTime()}`
    const pushName = `pushName ${new Date().getTime()}`
    const messageTimestamp = Math.floor(new Date().getTime() / 1000).toString()
    const input = {
      key: {
        remoteJid,
        fromMe: false,
        id,
      },
      message: {
        documentWithCaptionMessage:{
          message:{
            listMessage:{
              title, description, buttonText, footerText, headerText,
              listType: 'SINGLE_SELECT',
              sections:[
                {title, rows:[{title, description, rowId}]}
              ]
            }
          }
        }
      },
      pushName,
      messageTimestamp,
    }
    const output = {
      object: 'whatsapp_business_account',
      entry: [
        {
          id: remoteJid,
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
                    interactive: {
                      type: 'list',
                      header: {
                        text: headerText
                      },
                      body: {
                        text: description
                      },
                      footer: {
                        text: footerText
                      },
                      action: {
                        button: buttonText,
                        sections: [
                          {title, rows: [ { id: rowId, title, description }]}
                        ]
                      }
                    },
                    type: 'interactive'
                  },
                ],
                contacts: [{ profile: { name: pushName, picture: undefined }, wa_id: '5549988290955' }],
                statuses: [],
                errors: []
              },
              field: 'messages'
            },
          ],
        },
      ],
    }
    expect(fromBaileysMessageContent(phoneNumer, input)[0]).toEqual(output)
  })

  test('fromBaileysMessageContent with documentWithCaptionMessage and buttonsMessage', async () => {
    const phoneNumer = '5549998360838'
    const remotePhoneNumer = '554988290955'
    const remoteJid = `${remotePhoneNumer}@s.whatsapp.net`
    const contentText = `contentText ${new Date().getTime()}`
    const buttonText = `buttonText ${new Date().getTime()}`
    const buttonId = `buttonId ${new Date().getTime()}`
    const footerText = `footerText ${new Date().getTime()}`
    const headerText = `headerText ${new Date().getTime()}`
    const id = `wa.${new Date().getTime()}`
    const pushName = `pushName ${new Date().getTime()}`
    const messageTimestamp = Math.floor(new Date().getTime() / 1000).toString()
    const input = {
      key: {
        remoteJid,
        fromMe: false,
        id,
      },
      message: {
        documentWithCaptionMessage:{
          message:{
            buttonsMessage:{
              contentText, footerText, headerText,
              buttons:[{ buttonId, buttonText: { displayText: buttonText }, type: 'RESPONSE'}]
            }
          }
        }
      },
      pushName,
      messageTimestamp,
    }
    const output = {
      object: 'whatsapp_business_account',
      entry: [
        {
          id: remoteJid,
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
                    interactive: {
                      type: 'button',
                      body: {
                        text: contentText
                      },
                      footer: {
                        text: footerText
                      },
                      header: {
                        text: headerText
                      },
                      action: {
                        buttons: [ { type: 'reply', reply: { id: buttonId, title: buttonText } }]
                      }
                    },
                    type: 'interactive'
                  },
                ],
                contacts: [{ profile: { name: pushName, picture: undefined }, wa_id: '5549988290955' }],
                statuses: [],
                errors: []
              },
              field: 'messages'
            },
          ],
        },
      ],
    }
    expect(fromBaileysMessageContent(phoneNumer, input)[0]).toEqual(output)
  })

  test('fromBaileysMessageContent with buttonsResponseMessage', async () => {
    const phoneNumer = '5549998360838'
    const remotePhoneNumer = '554988290955'
    const remoteJid = `${remotePhoneNumer}@s.whatsapp.net`
    const stanzaId = `wa.${new Date().getTime()}`
    const selectedDisplayText = `selectedDisplayText ${new Date().getTime()}`
    const id = `wa.${new Date().getTime()}`
    const selectedButtonId = `selectedButtonId.${new Date().getTime()}`
    const pushName = `Mary ${new Date().getTime()}`
    const messageTimestamp = Math.floor(new Date().getTime() / 1000).toString()
    const input = {
      key: {
        remoteJid,
        fromMe: false,
        id,
      },
      message: {
        buttonsResponseMessage: {
        selectedButtonId,
        selectedDisplayText,
        contextInfo: { stanzaId }
      }
      },
      pushName,
      messageTimestamp,
    }
    const output = {
      object: 'whatsapp_business_account',
      entry: [
        {
          id: remoteJid,
          changes: [
            {
              value: {
                messaging_product: 'whatsapp',
                metadata: { display_phone_number: phoneNumer, phone_number_id: phoneNumer },
                messages: [
                  {
                    context: {
                      id: stanzaId,
                      message_id: stanzaId
                    },
                    from: '5549988290955',
                    id,
                    timestamp: messageTimestamp,
                    interactive: { 
                      type: 'button_reply',
                      button_reply: { id: selectedButtonId, title: selectedDisplayText }
                    },
                    type: 'interactive'
                  },
                ],
                contacts: [{ profile: { name: pushName, picture: undefined }, wa_id: '5549988290955' }],
                statuses: [],
                errors: []
              },
              field: 'messages'
            },
          ],
        },
      ],
    }
    expect(fromBaileysMessageContent(phoneNumer, input)[0]).toEqual(output)
  })
})


// {
//    "payload":{
//       "object":"whatsapp_business_account",
//       "entry":[
//          {
//             "id":"252538077941948",
//             "changes":[
//                {
//                   "value":{
//                      "messaging_product":"whatsapp",
//                      "metadata":{
//                         "display_phone_number":"554940002610",
//                         "phone_number_id":"197323900140596"
//                      },
//                      "contacts":[
//                         {
//                            "profile":{
//                               "name":"Clairton"
//                            },
//                            "wa_id":"554988290955"
//                         }
//                      ],
//                      "messages":[
//                         {
//                            "context":{
//                               "from":"554940002610",
//                               "id":"wamid.HBgMNTU0OTg4MjkwOTU1FQIAERgSNjA1MUM5QjcxNkE2RjI5OTlBAA=="
//                            },
//                            "from":"554988290955",
//                            "id":"wamid.HBgMNTU0OTg4MjkwOTU1FQIAEhgUM0ExMTQwRTkxRUVENUJERTlGN0EA",
//                            "timestamp":"1768486070",
//                            "type":"button",
//                            "button":{
//                               "payload":"Verificar Disponibilidade",
//                               "text":"Verificar Disponibilidade"
//                            }
//                         }
//                      ]
//                   },
//                   "field":"messages"
//                }
//             ]
//          }
//       ]
//    }


// {
//   key: {
//       "remoteJid": "554940002610@s.whatsapp.net",
//       "fromMe": true,
//       "id": "3AD63E6C8A79A252B0DC",
//       "recipientLid": "202082908909711@lid"
//     }
//     messageTimestamp: 1768486521
//     pushName: "Clairton"
//     status: 2
//     message: {
//       "templateButtonReplyMessage": {
//         "selectedId": "Saber mais",
//         "selectedDisplayText": "Saber mais",
//         "contextInfo": {
//           "stanzaId": "6051C9B716A6F2999A",
//           "participant": "554940002610@s.whatsapp.net",
//           "quotedMessage": {
//             "templateMessage": {
//               "hydratedFourRowTemplate": {
//                 "imageMessage": {
//                   "url": "https://mmg.whatsapp.net/v/t62.7118-24/34665115_1539906810534119_110090755217396454_n.enc?ccb=11-4&oh=01_Q5Aa3AFYOzYwMHTI_qhxW3CUk_pQYa2EBvrc7Ii5ycD282xFkQ&oe=6943E740&_nc_sid=5e03e0&mms3=true",
//                   "mimetype": "image/jpeg",
//                   "fileSha256": "pAIYm4Y/02c7VsoK90P4BmAzkZDG4knLRyN9DKXdLes=",
//                   "fileLength": "179432",
//                   "height": 832,
//                   "width": 1600,
//                   "mediaKey": "4QLMqnAzPDa8E8aJzH8pM+2EFKqRhbykZ/m9rpNFZiM=",
//                   "fileEncSha256": "7D9vtQQVrdB+Qo/oiD2OWFV08NWJRjx055pbBwS6L5w=",
//                   "directPath": "/v/t62.7118-24/34665115_1539906810534119_110090755217396454_n.enc?ccb=11-4&oh=01_Q5Aa3AFYOzYwMHTI_qhxW3CUk_pQYa2EBvrc7Ii5ycD282xFkQ&oe=6943E740&_nc_sid=5e03e0",
//                   "mediaKeyTimestamp": "1763471010",
//                   "jpegThumbnail": "/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAFA3PEY8MlBGQUZaVVBfeMiCeG5uePWvuZHI////////////////////////////////////////////////////2wBDAVVaWnhpeOuCguv/////////////////////////////////////////////////////////////////////////wAARCAAlAEgDASIAAhEBAxEB/8QAHwAAAQUBAQEBAQEAAAAAAAAAAAECAwQFBgcICQoL/8QAtRAAAgEDAwIEAwUFBAQAAAF9AQIDAAQRBRIhMUEGE1FhByJxFDKBkaEII0KxwRVS0fAkM2JyggkKFhcYGRolJicoKSo0NTY3ODk6Q0RFRkdISUpTVFVWV1hZWmNkZWZnaGlqc3R1dnd4eXqDhIWGh4iJipKTlJWWl5iZmqKjpKWmp6ipqrKztLW2t7i5usLDxMXGx8jJytLT1NXW19jZ2uHi4+Tl5ufo6erx8vP09fb3+Pn6/8QAHwEAAwEBAQEBAQEBAQAAAAAAAAECAwQFBgcICQoL/8QAtREAAgECBAQDBAcFBAQAAQJ3AAECAxEEBSExBhJBUQdhcRMiMoEIFEKRobHBCSMzUvAVYnLRChYkNOEl8RcYGRomJygpKjU2Nzg5OkNERUZHSElKU1RVVldYWVpjZGVmZ2hpanN0dXZ3eHl6goOEhYaHiImKkpOUlZaXmJmaoqOkpaanqKmqsrO0tba3uLm6wsPExcbHyMnK0tPU1dbX2Nna4uPk5ebn6Onq8vP09fb3+Pn6/9oADAMBAAIRAxEAPwC0SACTTfMUetAbNG4YB9aAFLgHBoDgkAUA5JGOlJvG78cZoAVyQjEdQKrqvylt7bqsMygfMQKgVhhiDxQNE4OQKWmo6uMgijf8vA5JwBQIcaKYZPmA684J96KAGqoZQT9akpqcKAaeKBsbt5PPBqOQrEpPc9BUxGKpHMzFicAdKBojLFiSTzQCQpXseamaOMMpYlR/Ok3kPwy+XQVciBxyOKtW7bgST8wqNY4mbhuPSk2tAQ2QRQD1LQjXk88/pRTkIYA9jRQZje1KDRRQAE0wKB0AoooAgu/4ar4oooNI7EttxL+FWiit94ZoooJluPXjgdKKKKCT/9k=",
//                   "thumbnailDirectPath": "/v/t62.35850-24/12093040_1353499959905316_6421062811199989067_n.enc?ccb=11-4&oh=01_Q5Aa3AHm7I55_RwOa2p-iCqibXZeNDV86ueFwsLwD1C8zTQprg&oe=6943E3BA&_nc_sid=5e03e0",
//                   "thumbnailSha256": "P5ZmDTKY+6CbRltai4gxbWwraiAde5RbwkFx67AQY4s=",
//                   "thumbnailEncSha256": "LLdyjhlncDVWnh9Lzz90MCibL7TPf3P95v4SBOS00Eg="
//                 },
//                 "hydratedContentText": "📢 Olá! Aqui é o *Celso Portiolli*, embaixador da Odonto Excellence! 😁✨\n\n😃*Joao D.*, que está na sua rede de contatos e faz tratamento conosco, ficou tão satisfeito(a) que indicou você para uma consulta de avaliação odontológica completa!\n\n💳 Na *Odonto Excellence* oferecemos um parcelamento com crediário próprio e *aprovação* na hora, você *escolhe* a data de vencimento e o valor da sua parcela.\n\n💰 Além disso, temos várias formas para você conseguir *descontos* e pagar menos pelo seu tratamento!\n\n💙 É *maravilhoso* ter pessoas ao nosso redor que se importam com a nossa saúde e bem-estar!\n\n📅 Que tal verificar a disponibilidade e a até mesmo agendar sua visita para *hoje*? \n\n🦷 Aqui você decide e já pode iniciar seu tratamento na *hora*! 🚀",
//                 "hydratedButtons": [
//                   {
//                     "quickReplyButton": {
//                       "displayText": "Verificar Disponibilidade",
//                       "id": "Verificar Disponibilidade"
//                     },
//                     "index": 0
//                   },
//                   {
//                     "quickReplyButton": {
//                       "displayText": "Saber mais",
//                       "id": "Saber mais"
//                     },
//                     "index": 1
//                   },
//                   {
//                     "quickReplyButton": {
//                       "displayText": "Somente mês que vem",
//                       "id": "Somente mês que vem"
//                     },
//                     "index": 2
//                   },
//                   {
//                     "quickReplyButton": {
//                       "displayText": "No momento não",
//                       "id": "No momento não"
//                     },
//                     "index": 3
//                   }
//                 ],
//                 "templateId": "1033393388290309"
//               }
//             }
//           }
//         },
//         "selectedIndex": 1
//       }
//     }
// }

// {
//   key: {
//     "remoteJid": "554931978550@s.whatsapp.net",
//     "fromMe": false,
//     "id": "2A3FE4E4A9DE7EE726E0",
//     "senderLid": "122763419345068@lid",
//     "senderPn": "554931978550@s.whatsapp.net"
//   }
//   messageTimestamp: 1768493098
//   pushName: "Odonto Excellence Financeiro"
//   message: {
//     "messageContextInfo": {
//       "deviceListMetadata": {
//         "senderKeyHash": "F60qNks9STXvaw==",
//         "senderTimestamp": "1768407677",
//         "recipientKeyHash": "hDjPmlXrZHIciQ==",
//         "recipientTimestamp": "1767300812"
//       },
//       "deviceListMetadataVersion": 2,
//       "messageSecret": "+GW8niGoIYnKlJ2NeHJnqyXJufbl78omvPx1XFzNkjg="
//     },
//     "listResponseMessage": {
//       "title": "row-title-content",
//       "listType": "SINGLE_SELECT",
//       "singleSelectReply": {
//         "selectedRowId": "unique-row-identifier"
//       },
//       "contextInfo": {
//         "stanzaId": "3EB0C05C5D76F83EAA4095",
//         "participant": "554988290955@s.whatsapp.net",
//         "quotedMessage": {
//           "listMessage": {
//             "title": "Title",
//             "description": "your-text-message-content",
//             "buttonText": "sections",
//             "listType": "SINGLE_SELECT",
//             "sections": [
//               {
//                 "title": "your-section-title-content",
//                 "rows": [
//                   {
//                     "title": "row-title-content",
//                     "description": "row-description-content",
//                     "rowId": "unique-row-identifier"
//                   }
//                 ]
//               },
//               {
//                 "title": "your-section-title-content",
//                 "rows": [
//                   {
//                     "title": "row-title-content",
//                     "description": "row-description-content",
//                     "rowId": "unique-row-identifier"
//                   }
//                 ]
//               }
//             ],
//             "footerText": "Cloud UnoApi"
//           }
//         }
//       },
//       "description": "row-description-content"
//     }
//   }
//   verifiedBizName: "Odonto Excellence Financeiro"
// }



// {
//   "object":"whatsapp_business_account",
//   "entry":[
//     {
//       "id":"5549988290955",
//       "changes":[
//         {
//           "value":{
//             "messaging_product":"whatsapp",
//             "metadata":{
//               "display_phone_number":"5549988290955",
//               "phone_number_id":"5549988290955"
//             },
//             "contacts":[
//               {
//                 "wa_id":"554931978550",
//                 "profile":{
//                   "name":"",
//                   "picture":""
//                 }
//               }
//             ],
//             "messages":[
//               {
//                 "from":"5549988290955",
//                 "id":"UNO.INC.099B7B00F22D11F08BF3FFD8522FCB29",
//                 "timestamp":"1768493569",
//                 "interactive":{
//                   "type":"list",
//                   "header":{
//                     "type":"text",
//                     "text":"Title"
//                   },
//                   "body":{
//                     "text":"Qual a api melhor custo beneficio?"
//                   },
//                   "footer":{
//                     "text":"Cloud UnoApi"
//                   },
//                   "action":{
//                     "button":"sections",
//                     "sections":[
//                       {
//                         "title":"Cloud Oficial",
//                         "rows":[
//                           {
//                             "id":"oficial",
//                             "title":"Cloud Oficial",
//                             "description":"varias limitações, como iniciar conversas pagando pela janela de 24, se o cliente responder"
//                           }
//                         ]
//                       },
//                       {
//                         "title":"Unoapi",
//                         "rows":[
//                           {
//                             "id":"uno",
//                             "title":"UnoApi",
//                             "description":"continuar usando o whatsapp no smarphone e sincronizar as mensagem de todos os dispositvos"
//                           }
//                         ]
//                       }
//                     ]
//                   }
//                 },
//                 "type":"interactive"
//               }
//             ]
//           },
//           "field":"messages"
//         }
//       ]
//     }
//   ]
// }



// {
//   "key":{
//     "remoteJid":"554931978550@s.whatsapp.net",
//     "fromMe":true,
//     "id":"3EB05F6945EFC0B83785D9"
//   },
//   "message":{
//     "documentWithCaptionMessage":{
//       "message":{
//         "messageContextInfo":{
//           "messageSecret":"wtUqMQf6kALjNlD+W/ozz4WpUMuabmtSAa+8KLN7Tu0="
//         },
//         "listMessage":{
//           "title":"Title",
//           "description":"Qual a api melhor custo beneficio?",
//           "buttonText":"sections",
//           "listType":"SINGLE_SELECT",
//           "sections":[
//             {
//               "title":"Cloud Oficial",
//               "rows":[
//                 {
//                   "title":"Cloud Oficial",
//                   "description":"varias limitações, como iniciar conversas pagando pela janela de 24, se o cliente responder",
//                   "rowId":"oficial"
//                 }
//               ]
//             },
//             {
//               "title":"Unoapi",
//               "rows":[
//                 {
//                   "title":"UnoApi",
//                   "description":"continuar usando o whatsapp no smarphone e sincronizar as mensagem de todos os dispositvos",
//                   "rowId":"uno"
//                 }
//               ]
//             }
//           ],
//           "footerText":"Cloud UnoApi"
//         }
//       }
//     }
//   }
// }