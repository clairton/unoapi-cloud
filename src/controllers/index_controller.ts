import { Request, Response } from 'express'

class IndexController {
  public ping(_req: Request, res: Response) {
    res.set('Content-Type', 'text/plain')
    return res.status(200).send('pong!')
  }
}

export const indexController = new IndexController()
