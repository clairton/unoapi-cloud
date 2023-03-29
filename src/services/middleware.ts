import { Request, Response, NextFunction } from 'express'

export default interface middleware {
  (req: Request, res: Response, next: NextFunction): Promise<void>
}
