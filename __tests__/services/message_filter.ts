import { WAMessageKey } from '@adiwajshing/baileys'
import { Config, defaultConfig } from '../../src/services/config'
import { MessageFilter } from '../../src/services/message_filter'

describe('service message filter', () => {
  test('ignore group message', async () => {
    const config: Config = {
      ...defaultConfig,
      ignoreGroupMessages: true,
      ignoreBroadcastStatuses: false,
      ignoreBroadcastMessages: false,
      ignoreOwnMessages: false,
    }
    const filter: MessageFilter = new MessageFilter(config)
    const remoteJid = 'akjshdkasdsadhk@g.us'
    expect(filter.isIgnoreJid(remoteJid)).toBe(true)
  })

  test('not ignore group message', async () => {
    const config: Config = {
      ...defaultConfig,
      ignoreGroupMessages: false,
      ignoreBroadcastStatuses: false,
      ignoreBroadcastMessages: false,
      ignoreOwnMessages: false,
    }
    const filter: MessageFilter = new MessageFilter(config)
    const remoteJid = 'akjshdkasdsadhk@g.us'
    expect(filter.isIgnoreJid(remoteJid)).toBe(false)
  })

  test('ignore own message', async () => {
    const config: Config = {
      ...defaultConfig,
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
    expect(filter.isIgnoreKey(key, '')).toBe(true)
  })

  test('not ignore own message when is update', async () => {
    const config: Config = {
      ...defaultConfig,
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
    expect(filter.isIgnoreKey(key, 'update')).toBe(false)
  })

  test('not ignore own message', async () => {
    const config: Config = {
      ...defaultConfig,
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
    expect(filter.isIgnoreKey(key, '')).toBe(false)
  })

  test('ignore broadcast status', async () => {
    const config: Config = {
      ...defaultConfig,
      ignoreGroupMessages: false,
      ignoreBroadcastStatuses: true,
      ignoreBroadcastMessages: false,
      ignoreOwnMessages: false,
      rejectCalls: '',
    }
    const filter: MessageFilter = new MessageFilter(config)
    const remoteJid = 'status@broadcast'
    expect(filter.isIgnoreJid(remoteJid)).toBe(true)
  })

  test('not broadcast status', async () => {
    const config: Config = {
      ...defaultConfig,
      ignoreGroupMessages: false,
      ignoreBroadcastStatuses: false,
      ignoreBroadcastMessages: false,
      ignoreOwnMessages: false,
    }
    const filter: MessageFilter = new MessageFilter(config)
    const remoteJid = 'status@broadcast'
    expect(filter.isIgnoreJid(remoteJid)).toBe(false)
  })

  test('ignore broadcast message', async () => {
    const config: Config = {
      ...defaultConfig,
      ignoreGroupMessages: false,
      ignoreBroadcastStatuses: false,
      ignoreBroadcastMessages: true,
      ignoreOwnMessages: false,
      rejectCalls: '',
    }
    const filter: MessageFilter = new MessageFilter(config)
    const remoteJid = '456@broadcast'
    expect(filter.isIgnoreJid(remoteJid)).toBe(true)
  })

  test('not broadcast message', async () => {
    const config: Config = {
      ...defaultConfig,
      ignoreGroupMessages: false,
      ignoreBroadcastStatuses: false,
      ignoreBroadcastMessages: false,
      ignoreOwnMessages: false,
    }
    const filter: MessageFilter = new MessageFilter(config)
    const remoteJid = '789@broadcast'
    expect(filter.isIgnoreJid(remoteJid)).toBe(false)
  })
})
