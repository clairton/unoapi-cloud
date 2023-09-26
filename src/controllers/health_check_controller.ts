import { Request, Response } from 'express'

export class HealthCheckController {
  public async index(req: Request, res: Response) {
    return res.json({ message: 'UnoAPI online' })
  }
}
