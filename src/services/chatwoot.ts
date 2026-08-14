import fetch from 'node-fetch'
import logger from './logger'
import { Config, Webhook } from './config'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type ChatwootInbox = any

export interface SyncChatwootInbox {
  (phone: string, webhook: Webhook, config: Config): Promise<void>
}

// Creates or updates the whatsapp official inbox in Chatwoot for this session phone number,
// pointing it (api_key/phone_number_id/business_account_id) to unoapi, so Chatwoot uses
// unoapi as the whatsapp cloud api provider for this number.
export const syncChatwootInbox: SyncChatwootInbox = async (phone: string, webhook: Webhook, config: Config) => {
  if (webhook.type !== 'chatwoot') {
    return
  }
  if (!webhook.chatwootUrl || !webhook.chatwootAccountId || !webhook.chatwootToken) {
    logger.warn(
      `Webhook %s of session %s is type chatwoot but is missing chatwootUrl, chatwootAccountId or chatwootToken, skipping inbox sync`,
      webhook.id,
      phone,
    )
    return
  }
  if (!config.authToken) {
    logger.warn(`Session %s has no authToken, skipping chatwoot inbox sync for webhook %s`, phone, webhook.id)
    return
  }

  const baseUrl = webhook.chatwootUrl.replace(/\/$/, '')
  const accountId = webhook.chatwootAccountId
  const headers = { 'Content-Type': 'application/json', api_access_token: webhook.chatwootToken }
  const phoneDigits = phone.replace(/\D/g, '')
  const phoneNumber = `+${phoneDigits}`

  const providerConfig = {
    api_key: config.authToken,
    phone_number_id: phoneDigits,
    business_account_id: phoneDigits,
  }

  const listUrl = `${baseUrl}/api/v1/accounts/${accountId}/inboxes`
  logger.debug(`Chatwoot: listing inboxes at %s to find phone %s`, listUrl, phoneNumber)
  const listResponse = await fetch(listUrl, { headers })
  if (!listResponse.ok) {
    throw new Error(`Error listing Chatwoot inboxes at ${listUrl}: ${listResponse.status} ${await listResponse.text()}`)
  }
  const listBody: { payload?: ChatwootInbox[] } = await listResponse.json()
  const inboxes = listBody.payload || []
  const existing = inboxes.find(
    (i: ChatwootInbox) => i.channel_type === 'Channel::Whatsapp' && [phoneNumber, phoneDigits].includes(i.phone_number),
  )

  if (existing) {
    const updateUrl = `${baseUrl}/api/v1/accounts/${accountId}/inboxes/${existing.id}`
    logger.info(`Chatwoot: updating inbox %s for phone %s to point to unoapi`, existing.id, phone)
    const updateResponse = await fetch(updateUrl, {
      method: 'PATCH',
      headers,
      body: JSON.stringify({ channel: { provider_config: providerConfig } }),
    })
    if (!updateResponse.ok) {
      throw new Error(`Error updating Chatwoot inbox ${existing.id} at ${updateUrl}: ${updateResponse.status} ${await updateResponse.text()}`)
    }
  } else {
    const createUrl = `${baseUrl}/api/v1/accounts/${accountId}/inboxes`
    logger.info(`Chatwoot: creating inbox for phone %s pointing to unoapi`, phone)
    const createResponse = await fetch(createUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        name: webhook.chatwootNameInbox || phoneNumber,
        channel: {
          type: 'whatsapp',
          phone_number: phoneNumber,
          provider: 'whatsapp_cloud',
          provider_config: providerConfig,
        },
      }),
    })
    if (!createResponse.ok) {
      throw new Error(`Error creating Chatwoot inbox at ${createUrl} for phone ${phone}: ${createResponse.status} ${await createResponse.text()}`)
    }
  }
}

// Syncs every webhook of type chatwoot configured for this session.
export const syncChatwootInboxes = async (phone: string, config: Config) => {
  const webhooks = config.webhooks || []
  for (const webhook of webhooks) {
    if (webhook.type !== 'chatwoot') {
      continue
    }
    try {
      await syncChatwootInbox(phone, webhook, config)
    } catch (error) {
      logger.error(`Error syncing Chatwoot inbox for session %s and webhook %s: %s`, phone, webhook.id, error)
    }
  }
}
