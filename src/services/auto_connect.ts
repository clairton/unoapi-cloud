import { getClient, ConnectionInProgress } from './client'
import { getConfig } from './config'
import { SessionStore } from './session_store'
import { Outgoing } from './outgoing'
import { Incoming } from './incoming'
import { OnNewLogin } from './socket'

export const autoConnect = async (
  sessionStore: SessionStore,
  incoming: Incoming,
  outgoing: Outgoing,
  getConfig: getConfig,
  getClient: getClient,
  onNewLogin: OnNewLogin,
) => {
  try {
    const phones = await sessionStore.getPhones()
    console.info(`${phones.length} phones to verify is auto connect`)
    for (let i = 0, j = phones.length; i < j; i++) {
      const phone = phones[i]
      try {
        console.info(`Auto connecting phone ${phone}...`)
        try {
          getClient({ phone, incoming, outgoing, getConfig, onNewLogin })
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
        } catch (e: any) {
          if (e instanceof ConnectionInProgress) {
            console.info(`Connection already in progress ${phone}...`)
          } else {
            throw e
          }
        }
        console.info(`Auto connected phone ${phone}!`)
      } catch (error) {
        console.error(`Error on connect phone ${phone}`, error)
      }
    }
  } catch (error) {
    console.error('Erro on auto connect', error)
    throw error
  }
}
