import { Listener } from './listener'
import { OnNewLogin } from './socket'
import { phoneNumberToJid } from './transformer'
import { generateUnoId } from '../utils/id'

export const onNewLoginAlert = (listener: Listener): OnNewLogin => {
  return async (phone: string) => {
    const message = `Please be careful, the http endpoint is unprotected and if it is exposed in the network, someone else can send message as you!`
    const payload = {
      key: {
        remoteJid: phoneNumberToJid(phone),
        id: generateUnoId('NOT'),
      },
      message: {
        conversation: message,
      },
    }
    return listener.process(phone, [payload], 'notify')
  }
}
