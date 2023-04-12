import { Request, Response } from 'express'

class IndexController {
  public ping(req: Request, res: Response) {
    console.debug('ping method', req.method)
    console.debug('ping headers', req.headers)
    console.debug('ping params', req.params)
    console.debug('ping body', JSON.stringify(req.body, null, ' '))
    res.set('Content-Type', 'text/plain')
    return res.status(200).send('pong!')
  }
}

export const indexController = new IndexController()
