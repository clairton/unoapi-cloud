import { WAMessageKey } from '@adiwajshing/baileys'
import { ClientConfig, defaultClientConfig } from '../../src/services/client'
import { MessageFilter } from '../../src/services/message_filter'

describe('service message filter', () => {
  test('ignore group message', async () => {
    const config: ClientConfig = {
      ...defaultClientConfig,
      ignoreGroupMessages: true,
      ignoreBroadcastStatuses: false,
      ignoreBroadcastMessages: false,
      ignoreOwnMessages: false,
    }
    const filter: MessageFilter = new MessageFilter(config)
    const key: WAMessageKey = {
      remoteJid: 'akjshdkasdsadhk@g.us',
    }
    expect(filter.isIgnore({ key, messageType: '' })).toBe(true)
  })

  test('not ignore group message', async () => {
    const config: ClientConfig = {
      ...defaultClientConfig,
      ignoreGroupMessages: false,
      ignoreBroadcastStatuses: false,
      ignoreBroadcastMessages: false,
      ignoreOwnMessages: false,
    }
    const filter: MessageFilter = new MessageFilter(config)
    const key: WAMessageKey = {
      remoteJid: 'akjshdkasdsadhk@g.us',
    }
    expect(filter.isIgnore({ key, messageType: '' })).toBe(false)
  })

  test('ignore own message', async () => {
    const config: ClientConfig = {
      ...defaultClientConfig,
      ignoreGroupMessages: false,
      ignoreBroadcastStatuses: false,
      ignoreBroadcastMessages: false,
      ignoreOwnMessages: true,
      rejectCalls: '',
    }
    const filter: MessageFilter = new MessageFilter(config)
    const key: WAMessageKey = {
      fromMe: true,
      remoteJid: '456',
    }
    expect(filter.isIgnore({ key, messageType: '' })).toBe(true)
  })

  test('not ignore own message when is update', async () => {
    const config: ClientConfig = {
      ...defaultClientConfig,
      ignoreGroupMessages: false,
      ignoreBroadcastStatuses: false,
      ignoreBroadcastMessages: false,
      ignoreOwnMessages: true,
      rejectCalls: '',
    }
    const filter: MessageFilter = new MessageFilter(config)
    const key: WAMessageKey = {
      remoteJid: '554998093075@s.whatsapp.net',
      fromMe: true,
      id: 'BAE5CEC6F8514837',
    }
    expect(filter.isIgnore({ key, messageType: 'update' })).toBe(false)
  })

  test('not ignore own message', async () => {
    const config: ClientConfig = {
      ...defaultClientConfig,
      ignoreGroupMessages: false,
      ignoreBroadcastStatuses: false,
      ignoreBroadcastMessages: false,
      ignoreOwnMessages: false,
    }
    const filter: MessageFilter = new MessageFilter(config)
    const key: WAMessageKey = {
      fromMe: true,
      remoteJid: '123',
    }
    expect(filter.isIgnore({ key, messageType: '' })).toBe(false)
  })

  test('ignore broadcast status', async () => {
    const config: ClientConfig = {
      ...defaultClientConfig,
      ignoreGroupMessages: false,
      ignoreBroadcastStatuses: true,
      ignoreBroadcastMessages: false,
      ignoreOwnMessages: false,
      rejectCalls: '',
    }
    const filter: MessageFilter = new MessageFilter(config)
    const key: WAMessageKey = {
      remoteJid: 'status@broadcast',
    }
    expect(filter.isIgnore({ key, messageType: '' })).toBe(true)
  })

  test('not broadcast status', async () => {
    const config: ClientConfig = {
      ...defaultClientConfig,
      ignoreGroupMessages: false,
      ignoreBroadcastStatuses: false,
      ignoreBroadcastMessages: false,
      ignoreOwnMessages: false,
    }
    const filter: MessageFilter = new MessageFilter(config)
    const key: WAMessageKey = {
      remoteJid: 'status@broadcast',
    }
    expect(filter.isIgnore({ key, messageType: '' })).toBe(false)
  })

  test('ignore broadcast message', async () => {
    const config: ClientConfig = {
      ...defaultClientConfig,
      ignoreGroupMessages: false,
      ignoreBroadcastStatuses: false,
      ignoreBroadcastMessages: true,
      ignoreOwnMessages: false,
      rejectCalls: '',
    }
    const filter: MessageFilter = new MessageFilter(config)
    const key: WAMessageKey = {
      remoteJid: '456@broadcast',
    }
    expect(filter.isIgnore({ key, messageType: '' })).toBe(true)
  })

  test('not broadcast message', async () => {
    const config: ClientConfig = {
      ...defaultClientConfig,
      ignoreGroupMessages: false,
      ignoreBroadcastStatuses: false,
      ignoreBroadcastMessages: false,
      ignoreOwnMessages: false,
    }
    const filter: MessageFilter = new MessageFilter(config)
    const key: WAMessageKey = {
      remoteJid: '789@broadcast',
    }
    expect(filter.isIgnore({ key, messageType: '' })).toBe(false)
  })
})
