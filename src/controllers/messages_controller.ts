/*
curl -X  POST \
 'https://graph.facebook.com/v13.0/FROM_PHONE_NUMBER_ID/messages' \
 -H 'Authorization: Bearer ACCESS_TOKEN' \
 -d '{
  "messaging_product": "whatsapp",
  "recipient_type": "individual",
  "to": "PHONE_NUMBER",
  "type": "text",
  "text": { // the text object
    "preview_url": false,
    "body": "MESSAGE_CONTENT"
  }
}'

{
    "messaging_product": "whatsapp",
    "contacts": [
        {
            "input": "16505076520",
            "wa_id": "16505076520"
        }
    ],
    "messages": [
        {
            "id": "wamid.HBgLMTY1MDUwNzY1MjAVAgARGBI5QTNDQTVCM0Q0Q0Q2RTY3RTcA"
        }
    ]
}
*/
// https://developers.facebook.com/docs/whatsapp/cloud-api/reference/messages#successful-response
// https://developers.facebook.com/docs/whatsapp/cloud-api/reference/messages#text-messages
// https://developers.facebook.com/docs/whatsapp/cloud-api/guides/mark-message-as-read

import { Request, Response } from 'express'
import { Response as ResponseUno } from '../services/response'
import { Incoming } from '../services/incoming'
import { Outgoing } from '../services/outgoing'
import logger from '../services/logger'

export class MessagesController {
  private incoming: Incoming
  private outgoing: Outgoing

  constructor(incoming: Incoming, outgoing: Outgoing) {
    this.incoming = incoming
    this.outgoing = outgoing
  }

  public async index(req: Request, res: Response) {
    logger.debug('messages method', req.method)
    logger.debug('messages headers', req.headers)
    logger.debug('messages params', req.params)
    logger.debug('messages body', JSON.stringify(req.body, null, ' '))
    const { phone } = req.params
    const payload: object = req.body
    try {
      const response: ResponseUno = await this.incoming.send(phone, payload, {})
      logger.debug('messages response', JSON.stringify(response.ok, null, ' '))
      await res.status(200).json(response.ok)
      if (response.error) {
        logger.debug('messages return status', JSON.stringify(response.error, null, ' '))
        await this.outgoing.send(phone, response.error)
      }
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (e: any) {
      return res.status(400).json({ status: 'error', message: e.message })
    }
  }
}
