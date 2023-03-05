// https://developers.facebook.com/docs/whatsapp/business-management-api/message-templates/

import { Request, Response } from 'express'
import template from '../services/template'

class TemplatesController {
  public async index(_req: Request, res: Response) {
    return res.status(200).json([template])
  }
}

export const templatesController = new TemplatesController()
