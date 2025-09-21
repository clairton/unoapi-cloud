import { Request, Response } from 'express'
import { getConfig } from '../services/config'
import { Contact } from '../services/contact'
import { phoneNumberToJid } from '../services/transformer'
import logger from '../services/logger'

export class PreflightController {
  private getConfig: getConfig
  private contact: Contact

  constructor(getConfig: getConfig, contact: Contact) {
    this.getConfig = getConfig
    this.contact = contact
  }

  public async status(req: Request, res: Response) {
    logger.debug('preflight status method %s', req.method)
    logger.debug('preflight status headers %s', JSON.stringify(req.headers))
    logger.debug('preflight status params %s', JSON.stringify(req.params))
    logger.debug('preflight status body %s', JSON.stringify(req.body))

    const { phone } = req.params
    const payload: any = req.body || {}
    const list: string[] = Array.isArray(payload.statusJidList) ? payload.statusJidList : []

    try {
      const config = await this.getConfig(phone)
      const store = await config.getStore(phone, config)
      const sessionStatus = await store.sessionStore.getStatus(phone)

      // normalize inputs to JIDs (accept numbers or full JIDs)
      const inputs = list.map((v) => `${v ?? ''}`.trim()).filter((v) => !!v)
      const normalized = inputs.map((v) => phoneNumberToJid(v))
      const uniqueNormalized = Array.from(new Set(normalized))

      // verify existence on WhatsApp using contact service
      const { contacts } = await this.contact.verify(phone, inputs, undefined)

      const recipients = inputs.map((input) => {
        const jid = phoneNumberToJid(input)
        const match = contacts.find((c) => `${c.input}` === `${input}`)
        return {
          input,
          normalized: jid,
          valid: !!(match && match.status === 'valid' && match.wa_id),
          wa_id: match?.wa_id || undefined,
        }
      })

      const validCount = recipients.filter((r) => r.valid).length
      const ready = sessionStatus === 'online' && validCount === uniqueNormalized.length

      const notes: string[] = []
      if (sessionStatus !== 'online') {
        notes.push('Session is not online')
      }
      if (validCount !== uniqueNormalized.length) {
        const invalids = recipients.filter((r) => !r.valid).map((r) => r.input)
        notes.push(`Some numbers not on WhatsApp: ${invalids.join(', ')}`)
      }
      // Helpful hints for Status visibility (cannot be auto-verified)
      notes.push('Ensure Status privacy includes recipients and contacts are saved on both sides')

      const response = {
        phone,
        session: { status: sessionStatus, online: sessionStatus === 'online' },
        counts: {
          requested: inputs.length,
          normalized: uniqueNormalized.length,
          valid: validCount,
        },
        recipients,
        ready,
        notes,
      }

      return res.status(200).json(response)
    } catch (e: any) {
      logger.error(e)
      return res.status(400).json({ status: 'error', message: e.message })
    }
  }
}

