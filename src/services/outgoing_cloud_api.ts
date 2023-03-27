import { WAMessage, GroupMetadata } from '@adiwajshing/baileys'
import { Outgoing } from './outgoing'
import fetch, { Response } from 'node-fetch'
import { fromBaileysMessageContent, getMessageType, isIndividualJid, TYPE_MESSAGES_TO_PROCESS_FILE } from './transformer'
import { MessageFilter } from './message_filter'
import { Store, getStore } from './store'

interface GetGroupMetadata {
  (message: WAMessage, store: Store): Promise<GroupMetadata | undefined>
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const ignoreGetGroupMetadata: GetGroupMetadata = async (_message: WAMessage, _store: Store) => undefined

const getGroupMetadata: GetGroupMetadata = async (message: WAMessage, store: Store) => {
  console.debug(`Retrieving group metadata...`)
  const { key } = message
  if (key.remoteJid && !isIndividualJid(key.remoteJid)) {
    return store?.dataStore.fetchGroupMetadata(key.remoteJid, undefined)
  }
  return undefined
}

export class OutgoingCloudApi implements Outgoing {
  private url: string
  private token: string
  private header: string
  private filter: MessageFilter
  private getGroupMetadata: GetGroupMetadata
  private getStore: getStore

  constructor(
    filter: MessageFilter,
    { ignoreGroupMessages }: { ignoreGroupMessages: boolean },
    getStore: getStore,
    url: string,
    token: string,
    header = 'Authorization',
  ) {
    this.filter = filter
    this.url = url
    this.token = token
    this.header = header
    this.getStore = getStore
    this.getGroupMetadata = ignoreGroupMessages ? ignoreGetGroupMetadata : getGroupMetadata
  }

  public async sendMany(phone: string, messages: object[]) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const filteredMessages = messages.filter((m: any) => {
      const messageType = getMessageType(m)
      return m.key && !this.filter.isIgnore({ key: m.key, messageType })
    })
    console.debug('%s filtereds messages/updates of %s', messages.length - filteredMessages.length, messages.length)
    await Promise.all(filteredMessages.map(async (m: object) => this.sendOne(phone, m)))
  }

  public async sendOne(phone: string, message: object) {
    console.debug(`Receive message %s`, message)
    const i: WAMessage = message as WAMessage
    const messageType = getMessageType(message)
    console.debug(`messageType %s...`, messageType)
    const store = await this.getStore(phone)
    if (messageType && !['update', 'receipt'].includes(messageType)) {
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      Reflect.set(message, 'groupMetadata', await this.getGroupMetadata(i, store!))
    }
    if (messageType && TYPE_MESSAGES_TO_PROCESS_FILE.includes(messageType)) {
      console.debug(`Saving media...`)
      await store?.mediaStore.saveMedia(i)
    }
    if (i.key && i.key.id) {
      await store?.dataStore.setKey(i.key.id, i.key)
    }
    const data = fromBaileysMessageContent(phone, message)
    return this.send(phone, data)
  }

  public async send(phone: string, message: object) {
    const body = JSON.stringify(message)
    const headers = {
      'Content-Type': 'application/json; charset=utf-8',
      [this.header]: this.token,
    }
    const url = `${this.url}/${phone}`
    console.debug(`Send url ${url} with headers %s and body %s`, headers, body)
    const response: Response = await fetch(url, { method: 'POST', body, headers })
    if (!response.ok) {
      throw await response.text()
    }
  }
}
