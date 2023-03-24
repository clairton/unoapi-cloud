import { AnyMessageContent, WASocket } from '@adiwajshing/baileys'
import { Outgoing } from './outgoing'
import { Store, getStore, stores } from './store'
import { connect, Connection } from './socket'
import { Client, getClient, ConnectionInProgress, ClientConfig, defaultClientConfig } from './client'
import { toBaileysMessageContent, phoneNumberToJid, isIndividualJid } from './transformer'
import { v1 as uuid } from 'uuid'
import { Response } from './response'
import { dataStores } from './data_store'
import { Incoming } from './incoming'

const clients: Map<string, Client> = new Map()
const connecting: Map<string, boolean> = new Map()

export const getClientBaileys: getClient = async (
  phone: string,
  incoming: Incoming,
  outgoing: Outgoing,
  getStore: getStore,
  config: ClientConfig,
): Promise<Client> => {
  if (!clients.has(phone)) {
    if (connecting.has(phone)) {
      throw new ConnectionInProgress(`Connection with number ${phone} already in progress, please wait!`)
    } else {
      connecting.set(phone, true)
      console.info('Creating client baileys %s', phone)
      const store: Store = await getStore(phone)
      const client = new ClientBaileys(phone, store, incoming, outgoing, config)
      await client.connect()
      console.info('Client baileys created and connected %s', phone)
      clients.set(phone, client)
      connecting.delete(phone)
    }
  } else {
    console.debug('Retrieving client baileys %s', phone)
  }
  return clients.get(phone) as Client
}

export class ClientBaileys implements Client {
  public phone: string
  public config: ClientConfig
  private sock: WASocket | undefined
  private outgoing: Outgoing
  private incoming: Incoming
  private store: Store | undefined

  constructor(phone: string, store: Store, incoming: Incoming, outgoing: Outgoing, config: ClientConfig = defaultClientConfig) {
    this.phone = phone
    this.store = store
    this.outgoing = outgoing
    this.incoming = incoming
    this.config = config
  }

  async connect() {
    console.info('Client connecting...')
    const connection: Connection<WASocket> = await connect({
      phone: this.phone,
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      store: this.store!,
      incoming: this.incoming,
      outgoing: this.outgoing,
      client: this,
      config: this.config,
    })
    console.info('Client connected!')
    this.sock = connection?.sock
  }

  async disconnect() {
    this.sock = undefined
    this.store = undefined
    // clean cache
    clients.delete(this.phone)
    stores.delete(this.phone)
    connecting.delete(this.phone)
    dataStores.delete(this.phone)
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async send(payload: any) {
    const { status, type, to } = payload
    if (!this.sock) {
      const code = 3
      const title = 'Please, read the QRCode!'
      await this.sendStatus(title)
      this.connect()
      const id = uuid()
      const ok = {
        messaging_product: 'whatsapp',
        contacts: [
          {
            wa_id: to.replace('+', ''),
          },
        ],
        messages: [
          {
            id,
          },
        ],
      }
      const error = {
        object: 'whatsapp_business_account',
        entry: [
          {
            id: this.phone,
            changes: [
              {
                value: {
                  messaging_product: 'whatsapp',
                  metadata: {
                    display_phone_number: this.phone,
                    phone_number_id: this.phone,
                  },
                  statuses: [
                    {
                      id,
                      recipient_id: to,
                      status: 'failed',
                      timestamp: Math.floor(Date.now() / 1000),
                      errors: [
                        {
                          code,
                          title,
                        },
                      ],
                    },
                  ],
                },
                field: 'messages',
              },
            ],
          },
        ],
      }
      const r: Response = { ok, error }
      return r
    }
    if (status) {
      if (['sent', 'delivered', 'failed', 'progress', 'read'].includes(status)) {
        if (status == 'read') {
          const key = await this.store?.dataStore?.loadKey(payload?.message_id)
          console.debug('key %s for %s', key, payload?.message_id)
          if (key) {
            await this.sock?.readMessages([key])
          }
        }
        const r: Response = { ok: { success: true } }
        return r
      } else {
        throw new Error(`Unknow message status ${status}`)
      }
    } else if (type) {
      if (['text', 'image', 'audio', 'document', 'video', 'template'].includes(type)) {
        const jid: string = await this.toJid(to)
        if (!jid) {
          const id = uuid()
          const ok = {
            messaging_product: 'whatsapp',
            contacts: [
              {
                wa_id: to.replace('+', ''),
              },
            ],
            messages: [
              {
                id,
              },
            ],
          }
          const error = {
            object: 'whatsapp_business_account',
            entry: [
              {
                id: this.phone,
                changes: [
                  {
                    value: {
                      messaging_product: 'whatsapp',
                      metadata: {
                        display_phone_number: this.phone,
                        phone_number_id: this.phone,
                      },
                      statuses: [
                        {
                          id,
                          recipient_id: to,
                          status: 'failed',
                          timestamp: Math.floor(Date.now() / 1000),
                          errors: [
                            {
                              code: 2,
                              title: `The number ${to} does not have Whatsapp Account or was a error verify this!`,
                            },
                          ],
                        },
                      ],
                    },
                    field: 'messages',
                  },
                ],
              },
            ],
          }
          const r: Response = { ok, error }
          return r
        }
        const content: AnyMessageContent = toBaileysMessageContent(payload)
        console.debug('Send to baileys', jid, content)
        const response = await this.sock?.sendMessage(jid, content)
        console.debug('Sent to baileys', response)
        if (response) {
          const key = response.key
          const ok = {
            messaging_product: 'whatsapp',
            contacts: [
              {
                wa_id: to.replace('+', ''),
              },
            ],
            messages: [
              {
                id: key.id,
              },
            ],
          }
          const r: Response = { ok }
          return r
        }
      } else {
        throw new Error(`Unknow message type ${type}`)
      }
    }
    throw new Error(`Unknow message type ${JSON.stringify(payload)}`)
  }

  private async toJid(phoneNumber: string) {
    const bindJid: string = phoneNumberToJid(phoneNumber)
    if (isIndividualJid(bindJid)) {
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      const jid = await this.store?.dataStore?.getJid(phoneNumber, this.sock!)
      if (jid) {
        console.debug(`${phoneNumber} exists on WhatsApp, as jid: ${jid}`)
        return jid
      } else {
        console.warn(`${phoneNumber} not exists on WhatsApp`)
        return ''
      }
    }
    return bindJid
  }

  private async sendStatus(text: string) {
    const payload = {
      key: {
        remoteJid: phoneNumberToJid(this.phone),
        id: uuid(),
      },
      message: {
        conversation: text,
      },
      messageTimestamp: new Date().getTime(),
    }
    return this.outgoing.sendOne(this.phone, payload)
  }
}
