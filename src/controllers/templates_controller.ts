// https://developers.facebook.com/docs/whatsapp/business-management-api/message-templates/

import { Request, Response } from 'express'
import template from '../services/template'

class TemplatesController {
  public async index(req: Request, res: Response) {
    console.debug('templates headers', req.headers)
    console.debug('templates params', req.params)
    console.debug('templates body', JSON.stringify(req.body, null, ' '))
    return res.status(200).json({ data: [template] })
  }
}

export const templatesController = new TemplatesController()
