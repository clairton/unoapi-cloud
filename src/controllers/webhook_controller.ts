import { Request, Response } from 'express'

class WebwookController {
  public whatsapp(req: Request, res: Response) {
    console.debug('webhook headers', req.headers)
    console.debug('webhook params', req.params)
    console.debug('webhook body', JSON.stringify(req.body, null, ' '))
    res.status(200).send(`{"success": true}`)
  }
}

export const webhookController = new WebwookController()
