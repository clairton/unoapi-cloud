// https://developers.facebook.com/docs/whatsapp/marketing-messages-lite-api/?locale=pt_BR

import { Incoming } from '../services/incoming'
import { Outgoing } from '../services/outgoing'
import { MessagesController } from './messages_controller'

export class MarketingMessagesController extends MessagesController {

  constructor(incoming: Incoming, outgoing: Outgoing) {
    super(incoming, outgoing)
    this.endpoint = 'marketing_messages'
  }
}
