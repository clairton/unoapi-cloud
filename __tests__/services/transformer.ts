import {
  toBaileysJid,
  getMessageType,
  isIndividualJid,
  isIndividualMessage,
  formatJid,
  jidToPhoneNumber,
  phoneNumberToJid,
  fromBaileysMessageContent,
} from '../../src/services/transformer'

describe('service transformer', () => {
  test('toBaileysJid with phone number', async () => {
    expect(toBaileysJid('+5549988290955')).toEqual('+5549988290955@s.whatsapp.net')
  })
  test('toBaileysJid with group jid', async () => {
    const jid = '123456789-123345@g.us'
    expect(toBaileysJid(jid)).toEqual(jid)
  })

  test('getMessageType with conversation', async () => {
    expect(getMessageType({ message: { conversation: 'test' } })).toEqual('conversation')
  })

  test('getMessageType with imageMessage', async () => {
    expect(getMessageType({ message: { imageMessage: {} } })).toEqual('imageMessage')
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

  test('jidToPhoneNumber without + and put 9˚ digit', async () => {
    expect(jidToPhoneNumber('+554988290955@s.whatsapp.net', '')).toEqual('5549988290955')
  })

  test('phoneNumberToJid', async () => {
    expect(phoneNumberToJid('+554988290955')).toEqual('5549988290955@s.whatsapp.net')
  })

  test('fromBaileysMessageContent with text', async () => {
    const phoneNumer = '5549998360838'
    const remoteJid = '554988290955@s.whatsapp.net'
    const body = `${new Date().getTime()}`
    const id = `wa.${new Date().getTime()}`
    const pushName = `Mary ${new Date().getTime()}`
    const messageTimestamp = new Date().getTime()
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
                    from: phoneNumer,
                    id,
                    timestamp: messageTimestamp,
                    text: { body },
                    type: 'text',
                  },
                ],
                contacts: [{ profile: { name: pushName }, wa_id: '+5549988290955' }],
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
    const remoteJid = '554988290955@s.whatsapp.net'
    const link = `${text}.pdf`
    const id = `wa.${new Date().getTime()}`
    const pushName = `Jhon ${new Date().getTime()}`
    const messageTimestamp = new Date().getTime()
    const mimetype = 'application/pdf'
    const fileSha256 = `fileSha256 ${new Date().getTime()}`
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
                    from: phoneNumer,
                    id,
                    timestamp: messageTimestamp,
                    audio: {
                      caption: text,
                      mime_type: mimetype,
                      id,
                      sha256: fileSha256,
                    },
                    type: 'audio',
                  },
                ],
                contacts: [{ profile: { name: pushName }, wa_id: '+5549988290955' }],
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
    const pushName = 'Forrest Gump'
    const messageTimestamp = new Date().getTime()
    const input = {
      key: {
        remoteJid,
        fromMe: false,
        id,
      },
      message: {
        contactMessage: {
          vcard: ['BEGIN:VCARD', 'VERSION:4.0', 'N:Einstein', `FN:${pushName}`, `TEL:${remotePhoneNumber}`, 'END:VCARD'].join('\r\n'),
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
                contacts: [{ profile: { name: pushName }, wa_id: remotePhoneNumber }],
                messages: [
                  {
                    from: phoneNumer,
                    id,
                    timestamp: messageTimestamp,
                    contacts: [
                      {
                        name: {
                          formatted_name: pushName,
                        },
                        phones: remotePhoneNumber,
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
})
