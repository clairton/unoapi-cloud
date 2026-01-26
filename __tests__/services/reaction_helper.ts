import { resolveReactionPayload } from '../../src/services/reaction_helper'
import { SendError } from '../../src/services/send_error'
import { toBaileysMessageContent } from '../../src/services/transformer'

describe('resolveReactionPayload', () => {
  test('resolves reaction key and target', async () => {
    const loadKey = jest.fn(async (id: string) => {
      if (id === 'UNO_ID') {
        return {
          id: 'BAILEYS_ID',
          remoteJid: '554988189915@s.whatsapp.net',
          fromMe: true,
        }
      }
      return undefined
    })
    const loadUnoId = jest.fn(async (id: string) => (id === 'MSG_ID' ? 'UNO_ID' : undefined))
    const loadMessage = jest.fn(async () => ({ key: { id: 'BAILEYS_ID', remoteJid: '554988189915@s.whatsapp.net', fromMe: true } }))
    const dataStore = { loadKey, loadUnoId, loadMessage }
    const payload = {
      type: 'reaction',
      reaction: { message_id: 'MSG_ID', emoji: '👍' },
    }
    const result = await resolveReactionPayload(payload, dataStore)
    expect(result.emoji).toEqual('👍')
    expect(result.targetTo).toEqual('554988189915@s.whatsapp.net')
    expect(result.reactionKey).toMatchObject({ id: 'BAILEYS_ID', remoteJid: '554988189915@s.whatsapp.net' })
  })

  test('throws on missing message_id', async () => {
    const dataStore = {}
    await expect(resolveReactionPayload({ type: 'reaction', reaction: { emoji: 'ok' } }, dataStore)).rejects.toBeInstanceOf(SendError)
  })

  test('cloud api reaction payload to baileys content', async () => {
    const dataStore = {
      loadKey: jest.fn(async (id: string) => {
        if (id === '3EB0778F74E14FF7B1FCA4') {
          return {
            id: 'BAILEYS_ID',
            remoteJid: '556696269251@s.whatsapp.net',
            fromMe: true,
          }
        }
        return undefined
      }),
      loadUnoId: jest.fn(async () => undefined),
      loadMessage: jest.fn(async () => ({ key: { id: 'BAILEYS_ID', remoteJid: '556696269251@s.whatsapp.net', fromMe: true } })),
    }
    const cloudInput = {
      messaging_product: 'whatsapp',
      to: '556696269251',
      type: 'reaction',
      reaction: {
        message_id: '3EB0778F74E14FF7B1FCA4',
        emoji: '👍',
      },
    }
    const resolved = await resolveReactionPayload(cloudInput, dataStore)
    const resolvedPayload = {
      ...cloudInput,
      reaction: {
        ...(cloudInput as any).reaction,
        emoji: resolved.emoji,
        key: resolved.reactionKey,
      },
    }
    const result = toBaileysMessageContent(resolvedPayload)
    expect(result).toEqual({
      react: {
        text: '👍',
        key: {
          id: 'BAILEYS_ID',
          remoteJid: '556696269251@s.whatsapp.net',
          fromMe: true,
        },
      },
    })
  })
})
