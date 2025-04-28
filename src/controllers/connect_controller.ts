import { Request, Response } from 'express'
import logger from '../services/logger'
import { Reload } from '../services/reload'
import { t } from '../i18n'

const connect = async (phone: string) => {
  return `<!DOCTYPE html>
    <script src="/socket.io.min.js"></script>
    <script>
      const apiUrl = window.location.origin;
      const socket = io(apiUrl, { path: '/ws' });
      socket.on('broadcast', function(data) {
        console.log(data)
        if (!data.phone || data.phone != ${phone}) {
          return;
        }
        if (data.type === 'qrcode') {
          document.getElementById('qrcode').innerHTML = ''
          document.getElementById('qrcode').innerHTML = '<img src="' + data.content + '" alt="QR Code">'
        } else {
          document.getElementById('qrcode').innerHTML = ''
          document.getElementById('content').innerHTML = data.content
        }
      });
      function generate() {
        fetch(apiUrl + '/generate/${phone}')
      }
    </script>
    <style>
      .box > * {
        border-radius: 5px;
      }

      .box {
        display: flex;
        flex-direction: column;
        justify-content: center;
        align-items: center;
      }
    </style>
    <body class="box">
      <button onclick="window.location.reload()" type="button">${t('reload')}</button>
      <pre id="content">${t('waiting_information')}</pre>
      <pre id="qrcode"></pre>
    </body>
  </html>`
}

export class ConnectController {
  private reload: Reload

  constructor(reload: Reload) {
    this.reload = reload
  }

  public async index(req: Request, res: Response) {
    logger.debug('connect method %s', JSON.stringify(req.method))
    logger.debug('connect headers %s', JSON.stringify(req.headers))
    logger.debug('connect params %s', JSON.stringify(req.params))
    logger.debug('connect body %s', JSON.stringify(req.body))
    const { phone } = req.params
    const html = await connect(phone)
    this.reload.run(phone)
    return res.send(html)
  }
}
