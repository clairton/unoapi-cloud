import { Client } from './client'
import { getClient } from './get_client'
import { SessionStore } from './session_store'
import { Outgoing } from './outgoing'
import { store } from './store'

export const autoConnect = async (getClient: getClient, sessionStore: SessionStore, outgoing: Outgoing, store: store) => {
  try {
    const phones = await sessionStore.getPhones()
    console.info(`${phones.length} phones to verify is auto connect`)
    for (let i = 0, j = phones.length; i < j; i++) {
      const phone = phones[i]
      try {
        console.info(`Auto connecting phone ${phone}...`)
        const client: Client = await getClient(phone, store, outgoing)
        console.info(`Auto connected phone ${phone}!`)
        await client.sendStatus(`Whatsapp ${phone} auto connect on start server! ${new Date()}`)
      } catch (error) {
        console.error(`Error on connect phone ${phone}`, error)
      }
    }
  } catch (error) {
    console.error('Erro on auto connect', error)
    throw error
  }
}
