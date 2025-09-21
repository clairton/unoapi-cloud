// Minimal runtime mock for @whiskeysockets/baileys to let ts-jest/Jest run without ESM transforms

type WAVersion = [number, number, number]

export const DisconnectReason = {
  connectionClosed: 428,
  connectionLost: 408,
  connectionReplaced: 440,
  timedOut: 408,
  loggedOut: 401,
  badSession: 500,
  restartRequired: 515,
  multideviceMismatch: 411,
  forbidden: 403,
  unavailableService: 503,
}

export const WAMessageAddressingMode = {
  PN: 'pn',
  LID: 'lid',
} as const

export const Browsers = {
  ubuntu: (browser: string) => ['Unoapi', browser, 'Linux'] as [string, string, string],
  macOS: (browser: string) => ['Unoapi', browser, 'macOS'] as [string, string, string],
  baileys: (browser: string) => ['Baileys', browser, 'Linux'] as [string, string, string],
  windows: (browser: string) => ['Unoapi', browser, 'Windows'] as [string, string, string],
  appropriate: (browser: string) => ['Unoapi', browser, 'Linux'] as [string, string, string],
}

export const fetchLatestBaileysVersion = async () => ({ version: [2, 2, 2] as WAVersion })
export const fetchLatestWaWebVersion = async () => ({ version: [2, 2, 2] as WAVersion })
export const delay = async (_ms?: number) => {}

// very light proto shape used by code paths
export const proto = {
  Message: {
    AppStateSyncKeyData: {
      create: (v: unknown) => v,
    },
  },
} as unknown as any

export const BufferJSON = {
  replacer: (_k: string, v: unknown) => v,
  reviver: (_k: string, v: unknown) => v,
}

// auth utils used in auth_state
export const initAuthCreds = () => ({ me: { id: '123@s.whatsapp.net' } }) as any
export const makeCacheableSignalKeyStore = (keys: any) => keys

// commonly-used helpers in code/tests
export const isJidStatusBroadcast = (jid: string) => jid === 'status@broadcast'
export const isJidGroup = (jid: string) => /@g\.us$/.test(jid)
export const isJidBroadcast = (jid: string) => /@broadcast$/.test(jid)
export const isJidNewsletter = (jid: string) => /@newsletter$/.test(jid)
export const isLidUser = (jid?: string) => !!jid && /@lid$/.test(jid)
export const isPnUser = (jid?: string) => !!jid && /@s\.whatsapp\.net$/.test(jid)
export const jidNormalizedUser = (jid: string) => jid

// storage/auth state helper used by data_store_file.ts
export const useMultiFileAuthState = async (_dir: string) => ({
  state: { creds: { me: { id: '123@s.whatsapp.net' } }, keys: {} },
  saveCreds: async () => {},
})

// media helpers used by media_store_file.ts
export const downloadMediaMessage = async () => Buffer.from('')
export const downloadContentFromMessage = async function* () { yield Buffer.from('') }

// Socket types used in code; we just need to return a minimal object with ev/process
const makeWASocketImpl = (_config: any) => {
  const listeners = new Map<string, Function>()
  const ev = {
    process: async (events: any) => {
      Object.keys(events).forEach((k) => {
        const cb = listeners.get(k)
        if (cb) cb((events as any)[k])
      })
    },
    removeAllListeners: (event: string) => listeners.delete(event),
  }
  return {
    ev,
    ws: { socket: { readyState: 1 }, close: () => {} },
    authState: { creds: { registered: false } },
    end: async () => {},
    logout: async () => {},
    requestPairingCode: async () => '0000-0000',
    profilePictureUrl: async () => undefined,
    groupMetadata: async () => undefined,
    presenceSubscribe: async () => {},
    sendPresenceUpdate: async () => {},
    sendMessage: async (_to: string, _msg: any, _opts?: any) => ({ key: { id: 'ABC' }, message: _msg }),
    relayMessage: async () => {},
    readMessages: async () => {},
    onWhatsApp: async (p: string) => [{ exists: true, jid: /@/.test(p) ? p : `${p}@s.whatsapp.net` }],
  }
}

export const makeWASocket = makeWASocketImpl
export default makeWASocketImpl

