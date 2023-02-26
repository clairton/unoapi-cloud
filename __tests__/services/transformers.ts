
import { toBaileysJid, toBaileysMessageContent } from '../../src/services/transformer'

describe('service transformer', () => {
  test('toBaileysJid with phone number', async () => {
    expect(toBaileysJid('+5549988290955')).toEqual('+5549988290955@s.whatsapp.net')
  })
  test('toBaileysJid with group jid', async () => {
    const jid = '123456789-123345@g.us'
    expect(toBaileysJid(jid)).toEqual(jid)
  })
  test('toBaileysMessageContent with text', async () => {
    const body = `${new Date().getTime()}`
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
  test('toBaileysMessageContent with media', async () => {
    const text = `${new Date().getTime()}`
    const link = `${text}.pdf`
    const input = {
      type: 'document',
      document: {
        link,
        caption: text,
      },
    }
    const output = {
      caption: text,
      mimeType: 'application/pdf',
      document: {
        url: link,
      },
    }
    expect(toBaileysMessageContent(input)).toEqual(output)
  })
})
