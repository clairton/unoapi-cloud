import { RELOAD_BAILEYS_DEBOUNCE_MS, UNOAPI_SERVER_NAME } from '../defaults'
import { getClient } from '../services/client'
import { getConfig } from '../services/config'
import { Listener } from '../services/listener'
import { OnNewLogin } from '../services/socket'
import logger from './logger'
import { Reload } from './reload'

export class ReloadBaileys extends Reload {
  private static readonly inFlightByPhone: Set<string> = new Set()
  private static readonly lastRunAtByPhone: Map<string, number> = new Map()
  private getClient: getClient
  private getConfig: getConfig
  private listener: Listener
  private onNewLogin: OnNewLogin

  constructor(getClient: getClient, getConfig: getConfig, listener: Listener, onNewLogin: OnNewLogin) {
    super()
    this.getClient = getClient
    this.getConfig = getConfig
    this.listener = listener
    this.onNewLogin = onNewLogin
  }

  async run(phone: string) {
    const now = Date.now()
    const lastRunAt = ReloadBaileys.lastRunAtByPhone.get(phone) || 0
    const debounceRemaining = Math.max(0, RELOAD_BAILEYS_DEBOUNCE_MS - (now - lastRunAt))
    if (ReloadBaileys.inFlightByPhone.has(phone) || debounceRemaining > 0) {
      logger.warn('Skip duplicated reload for %s (inFlight=%s debounceRemainingMs=%s)', phone, ReloadBaileys.inFlightByPhone.has(phone), debounceRemaining)
      return
    }
    ReloadBaileys.inFlightByPhone.add(phone)
    ReloadBaileys.lastRunAtByPhone.set(phone, now)
    try {
    logger.debug('Reload baileys run for phone %s', phone)
    const config = await this.getConfig(phone)
    if (config.server != UNOAPI_SERVER_NAME) {
      logger.debug('Reload broker for phone %s', phone)
      return super.run(phone)
    }
    const currentClient = await this.getClient({
      phone,
      listener: this.listener,
      getConfig: this.getConfig,
      onNewLogin: this.onNewLogin,
    })
    const store = await config.getStore(phone, config)
    const { sessionStore } = store
    const isConnecting = await sessionStore.isStatusConnecting(phone)
    const isRestartRequired = await sessionStore.isStatusRestartRequired(phone)
    if (isConnecting || isRestartRequired) {
      logger.warn('Skip destructive reload for %s while status is transitional (connecting=%s restartRequired=%s)', phone, isConnecting, isRestartRequired)
      return
    }
    const isOnline = await sessionStore.isStatusOnline(phone)
    const isStandBy = await sessionStore.isStatusStandBy(phone)
    if (isOnline || isStandBy) {
      logger.warn('Reload disconnect session %s!', phone)
      await currentClient.disconnect()
    }
    await super.run(phone)
    await this.getClient({
      phone,
      listener: this.listener,
      getConfig: this.getConfig,
      onNewLogin: this.onNewLogin,
    })
    logger.info('Reloaded session %s!', phone)
    } finally {
      ReloadBaileys.inFlightByPhone.delete(phone)
    }
  }
}
