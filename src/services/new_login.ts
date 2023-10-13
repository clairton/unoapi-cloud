import { v1 as uuid } from 'uuid'
import { Outgoing } from './outgoing'
import { OnNewLogin } from './socket'
import { phoneNumberToJid } from './transformer'

// eslint-disable-next-line
export const onNewLogin =
  (outgoing: Outgoing): OnNewLogin =>
  (phone: string): Promise<void> => {
    const message = `Please be careful, the http endpoint is unprotected and if it is exposed in the network, someone else can send message as you!`
    const payload = {
      key: {
        remoteJid: phoneNumberToJid(phone),
        id: uuid(),
      },
      message: {
        conversation: message,
      },
      messageTimestamp: new Date().getTime(),
    }
    return outgoing.sendOne(phone, payload)
  }
