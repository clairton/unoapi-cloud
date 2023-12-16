import { Request, Response } from 'express'
import { setConfig, getConfig } from '../services/redis'
import { Incoming } from '../services/incoming'
import { Outgoing } from '../services/outgoing'
import { getClient, ConnectionInProgress, Client } from '../services/client'
import { getConfig as getConfigUno } from '../services/config'
import { OnNewLogin } from '../services/socket'
import logger from '../services/logger'

export class ConfigController {
  private incoming: Incoming
  private outgoing: Outgoing
  private getConfig: getConfigUno
  private getClient: getClient
  private onNewLogin: OnNewLogin

  constructor(outgoing: Outgoing, incoming: Incoming, getConfig: getConfigUno, getClient: getClient, onNewLogin: OnNewLogin) {
    this.outgoing = outgoing
    this.incoming = incoming
    this.getConfig = getConfig
    this.getClient = getClient
    this.onNewLogin = onNewLogin
  }

  public async get(req: Request, res: Response) {
    logger.debug('register get headers %s', req.headers)
    logger.debug('register get body %s', req.body)
    logger.debug('register get params %s', req.params)
    const { phone } = req.params
    try {
      const config = await getConfig(phone)
      res.send(JSON.stringify({ config }))
    } catch (e) {
      logger.error(e, 'Error on retieve config')
      return res.status(400).json({ status: 'error', message: 'Error on retieve config' })
    }
  }

  public async set(req: Request, res: Response) {
    logger.debug('register get headers %s', req.headers)
    logger.debug('register get body %s', req.body)
    logger.debug('register get params %s', req.params)
    const { phone } = req.params
    const { config } = req.body
    try {
      await setConfig(phone, config)
      try {
        const client: Client = await this.getClient({
          phone,
          incoming: this.incoming,
          outgoing: this.outgoing,
          getConfig: this.getConfig,
          onNewLogin: this.onNewLogin,
        })
        await client.send(
          {
            to: phone,
            type: 'text',
            text: {
              body: `Uhull, evething is ok, read the qrcode and use this token to authentication`,
            },
          },
          {},
        )
        await client.disconnect()
        await client.connect()
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } catch (e: any) {
        if (e instanceof ConnectionInProgress) {
          logger.info(`Connection already in progress ${phone}...`)
        } else {
          throw e
        }
      }
      res.sendStatus(200)
    } catch (e) {
      logger.error(e, 'Error on register config')
      return res.status(400).json({ status: 'error', message: 'Error on register config' })
    }
  }
}
