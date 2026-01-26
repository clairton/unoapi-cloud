import { SendError } from './send_error'
import logger from './logger'

export type ReactionResolveResult = {
  emoji: string
  reactionKey: any
  targetTo: string
  messageId: string
}

export const resolveReactionPayload = async (payload: any, dataStore: any): Promise<ReactionResolveResult> => {
  const reaction = payload?.reaction || {}
  const messageId =
    reaction?.message_id ||
    reaction?.messageId ||
    payload?.message_id ||
    payload?.context?.message_id ||
    payload?.context?.id
  if (!messageId) {
    throw new SendError(400, 'invalid_reaction_payload: missing message_id')
  }
  let key = await dataStore?.loadKey(messageId)
  if (!key) {
    const unoId = await dataStore?.loadUnoId(messageId)
    if (unoId) {
      key = await dataStore?.loadKey(unoId)
    }
  }
  if (!key || !key.id || !key.remoteJid) {
    throw new SendError(404, `reaction_message_not_found: ${messageId}`)
  }
  const emojiRaw = typeof reaction?.emoji !== 'undefined'
    ? reaction.emoji
    : (typeof reaction?.text !== 'undefined' ? reaction.text : reaction?.value)
  const emoji = `${emojiRaw ?? ''}`
  let reactionKey = key
  try {
    const original = await dataStore?.loadMessage?.(reactionKey.remoteJid, reactionKey.id)
    if (original?.key) {
      reactionKey = { ...original.key, id: reactionKey.id }
      if (typeof reactionKey.participant === 'string' && reactionKey.participant.trim() === '') {
        delete (reactionKey as any).participant
      }
    }
  } catch {}
  try {
    logger.info(
      'REACTION send: msgId=%s key.id=%s key.remoteJid=%s key.participant=%s',
      messageId,
      reactionKey?.id || '<none>',
      reactionKey?.remoteJid || '<none>',
      (reactionKey as any)?.participant || '<none>',
    )
  } catch {}
  return { emoji, reactionKey, targetTo: reactionKey.remoteJid, messageId }
}
