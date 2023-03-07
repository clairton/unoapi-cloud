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
import { Incoming } from '../services/incoming'

export class MessagesController {
  private service: Incoming

  constructor(service: Incoming) {
    this.service = service
  }

  public async index(req: Request, res: Response) {
    console.debug('messages headers', req.headers)
    console.debug('messages params', req.params)
    console.debug('messages body', JSON.stringify(req.body, null, ' '))
    const { phone } = req.params
    const payload: object = req.body
    try {
      const response: object = await this.service.send(phone, payload)
      return res.status(200).json(response)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (e: any) {
      return res.status(400).json({ status: 'error', message: e.message })
    }
  }
}
