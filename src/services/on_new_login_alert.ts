import { v1 as uuid } from 'uuid'
import { Listener } from './listener'
import { OnNewLogin } from './socket'
import { phoneNumberToJid } from './transformer'

export const onNewLoginAlert = (listener: Listener): OnNewLogin => {
  return async (phone: string) => {
    const message = `Please be careful, the http endpoint is unprotected and if it is exposed in the network, someone else can send message as you!`
    const payload = {
      key: {
        remoteJid: phoneNumberToJid(phone),
        id: uuid(),
      },
      message: {
        conversation: message,
      },
    }
    return listener.process(phone, [payload], 'notify')
  }
}
