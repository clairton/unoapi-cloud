import { Request, Response } from 'express'
import logger from '../services/logger'
import { Contact } from '../services/contact'

export class ContactsController {
  private service: Contact

  constructor(service: Contact) {
    this.service = service
  }

  public async post(req: Request, res: Response) {
    logger.debug('contacts post method %s', req.method)
    logger.debug('contacts post headers %s', JSON.stringify(req.headers))
    logger.debug('contacts post params %s', JSON.stringify(req.params))
    logger.debug('contacts post body %s', JSON.stringify(req.body))
    const { phone } = req.params
    const contacts = await this.service.verify(phone, req.body.contacts || [])
    res.status(200).send({ contacts })
  }
}
