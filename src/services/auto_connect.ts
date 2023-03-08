import { getClient } from './get_client'
import { SessionStore } from './session_store'
import { Outgoing } from './outgoing'
import { getStore } from './get_store'
import { Store } from './store'

export const autoConnect = async (getClient: getClient, sessionStore: SessionStore, outgoing: Outgoing, getStore: getStore) => {
  try {
    const phones = await sessionStore.getPhones()
    console.info(`${phones.length} phones to verify is auto connect`)
    for (let i = 0, j = phones.length; i < j; i++) {
      const phone = phones[i]
      try {
        console.info(`Auto connecting phone ${phone}...`)
        const store: Store = await getStore(phone)
        await getClient(phone, store, outgoing)
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
