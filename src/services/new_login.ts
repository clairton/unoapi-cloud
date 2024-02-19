import { v1 as uuid } from 'uuid'
import { Listener } from './listener'
import { OnNewLogin } from './socket'
import { phoneNumberToJid } from './transformer'

/* eslint-disable */
export const onNewLogin =
  (listener: Listener): OnNewLogin =>
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
      messageTimestamp: Math.floor(new Date().getTime()).toString(),
    }
    return listener.process(phone, [payload], 'notify')
  }
/* eslint-enable */
