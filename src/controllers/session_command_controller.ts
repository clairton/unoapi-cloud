import { Request, Response } from 'express'
import axios from 'axios'
import { getConfig } from '../services/config'
import { Reload } from '../services/reload'
import { Logout } from '../services/logout'
import { WHATSMEOW_ADAPTER_BASEURL } from '../defaults'
import logger from '../services/logger'

export class SessionCommandController {
  private getConfig: getConfig
  private reloader: Reload
  private logout: Logout

  constructor(getConfig: getConfig, reload: Reload, logout: Logout) {
    this.getConfig = getConfig
    this.reloader = reload
    this.logout = logout
  }

  public async connect(req: Request, res: Response) {
    const { phone } = req.params
    try {
      const config = await this.getConfig(phone)
      const provider = config.provider || 'baileys'
      if (provider === 'whatsmeow') {
        await axios.post(`${WHATSMEOW_ADAPTER_BASEURL}/sessions/${phone}/connect`)
        return res.status(204).send()
      }
      await this.reloader.run(phone)
      return res.status(204).send()
    } catch (e) {
      logger.error(e, 'Error on connect session %s', phone)
      return res.status(500).json({ status: 'error', message: e.message })
    }
  }

  public async disconnect(req: Request, res: Response) {
    const { phone } = req.params
    try {
      const config = await this.getConfig(phone)
      const provider = config.provider || 'baileys'
      if (provider === 'whatsmeow') {
        await axios.post(`${WHATSMEOW_ADAPTER_BASEURL}/sessions/${phone}/disconnect`)
        return res.status(204).send()
      }
      await this.logout.run(phone)
      return res.status(204).send()
    } catch (e) {
      logger.error(e, 'Error on disconnect session %s', phone)
      return res.status(500).json({ status: 'error', message: e.message })
    }
  }

  public async reload(req: Request, res: Response) {
    const { phone } = req.params
    try {
      const config = await this.getConfig(phone)
      const provider = config.provider || 'baileys'
      if (provider === 'whatsmeow') {
        await axios.post(`${WHATSMEOW_ADAPTER_BASEURL}/sessions/${phone}/reload`)
        return res.status(204).send()
      }
      await this.reloader.run(phone)
      return res.status(204).send()
    } catch (e) {
      logger.error(e, 'Error on reload session %s', phone)
      return res.status(500).json({ status: 'error', message: e.message })
    }
  }

  public async qr(req: Request, res: Response) {
    const { phone } = req.params
    try {
      const config = await this.getConfig(phone)
      const provider = config.provider || 'baileys'
      if (provider === 'whatsmeow') {
        const response = await axios.get(`${WHATSMEOW_ADAPTER_BASEURL}/sessions/${phone}/qr`, {
          responseType: 'arraybuffer',
        })
        const base64 = Buffer.from(response.data, 'binary').toString('base64')
        return res.status(200).send(base64)
      }
      return res.status(404).json({ status: 'error', message: 'QR not supported for provider' })
    } catch (e) {
      logger.error(e, 'Error on get qr for session %s', phone)
      return res.status(500).json({ status: 'error', message: e.message })
    }
  }
}
