import { getSessionStatus, isSessionStatusIsDisconnect, isSessionStatusOffline } from '../services/session_store'
import { Request, Response } from 'express'
import { Server } from 'socket.io'
import { Config, defaultConfig, getConfig } from '../services/config'
import logger from '../services/logger'
import { Store } from '../services/store'
import QRCode from 'qrcode'
import { OnDisconnected, OnNewLogin, OnNotification, OnQrCode, OnReconnect, connect } from '../services/socket'

const configuration = async (phone: string, getConfig: getConfig) => {
  const config = await getConfig(phone)
  const keysToIgnore = ['getStore', 'baseStore', 'shouldIgnoreKey', 'shouldIgnoreJid', 'webhooks', 'getMessageMetadata', 'authToken', 'proxyUrl']
  const keys = Object.keys(defaultConfig).filter((k) => !keysToIgnore.includes(k))
  const getTypeofProperty = <T, K extends keyof T>(o: T, name: K) => typeof o[name]
  /* eslint-disable indent */
  return `<!DOCTYPE html>
    <body>
      <div id="content">
        <form method="POST" action="/v15.0/${phone}/register">
          ${await getSessionStatus(phone)}
          <label for="authToken">authToken</label><input type="text" name="authToken" id="authToken" value="" required="true"/><br/>
          <label for="proxyUrl">proxyUrl</label><input type="text" name="proxyUrl" id="proxyUrl" value=""/><br/><!--not show by security question-->
          ${keys
            .map((key) => {
              const type = getTypeofProperty(defaultConfig, key as keyof Config)
              if (type == 'boolean') {
                return `<label for="${key}">${key}</label>
                        <select name="${key}" id="${key}" value="${config[key] || ''}">
                          <option value="true" ${config[key] == 'true' ? 'selected' : ''}>true</option>
                          <option value="false" ${config[key] == 'false' || !config[key] ? 'selected' : ''}>false</option>
                        </select>
                        <br/>
                `
              } else {
                return `<label for="${key}">${key}</label><input type="${type}" name="${key}" id="${key}" value="${config[key] || ''}"/><br/>`
              }
            })
            .join('')}
          <br/>
          <input type="submit" value="Update Config"/>
        </form>
      </div>
    </body>
  </html>`
  /* eslint-enable indent */
}

const qrcode = async (phone: string, getConfig: getConfig, onNewLogin: OnNewLogin, socket: Server) => {
  const onQrCode: OnQrCode = async (qrCode: string) => {
    logger.debug('Reveived qrcode', qrCode)
    socket.emit('onQrCode', await QRCode.toString(qrCode))
  }
  // eslint-disable-next-line @typescript-eslint/no-empty-function
  const onNotification: OnNotification = async () => {}
  const onNewLoginLocal: OnNewLogin = async (phone: string) => {
    await onNewLogin(phone)
    const config = await getConfig(phone)
    socket.emit('onNewLogin', { authToken: config.authToken })
  }
  // eslint-disable-next-line @typescript-eslint/no-empty-function
  const onDisconnected: OnDisconnected = async () => {}
  // eslint-disable-next-line @typescript-eslint/no-empty-function
  const onReconnect: OnReconnect = async () => {}
  const config = await getConfig(phone)
  const store: Store = await config.getStore(phone, config)
  await connect({
    phone,
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    store: store!,
    attempts: 3,
    attempt: 0,
    onQrCode,
    onNotification,
    onNewLogin: onNewLoginLocal,
    config,
    onDisconnected,
    onReconnect,
  })

  return `<!DOCTYPE html>
    <script src="/socket.io/socket.io.js"></script>
    <script>
      var socket = io();
      socket.on('onNewLogin', function(msg){
        document.getElementById('qrcode').innerHTML = 'Pronto, seu token para authenticar é ' + msg.authToken;
        socket.on('onQrCode', function() {})
        socket.on('onNewLogin', function() {})
      });
      socket.on('onQrCode', function(qrcode){
        document.getElementById('qrcode').innerHTML = qrcode;
      });
    </script>
    <body>
      <pre id="qrcode"></pre>
    </body>
  </html>`
}

export class SessionController {
  private getConfig: getConfig
  private onNewLogin: OnNewLogin
  private socket: Server

  constructor(getConfig: getConfig, onNewLogin: OnNewLogin, socket: Server) {
    this.getConfig = getConfig
    this.onNewLogin = onNewLogin
    this.socket = socket
  }

  public async index(req: Request, res: Response) {
    logger.debug('session method %s', JSON.stringify(req.method))
    logger.debug('session headers %s', JSON.stringify(req.headers))
    logger.debug('session params %s', JSON.stringify(req.params))
    logger.debug('session body %s', JSON.stringify(req.body))
    const { phone } = req.params

    const generateQrcode = (await isSessionStatusIsDisconnect(phone)) || (await isSessionStatusOffline(phone))
    const html = generateQrcode ? await qrcode(phone, this.getConfig, this.onNewLogin, this.socket) : await configuration(phone, this.getConfig)
    return res.send(html)
  }
}
