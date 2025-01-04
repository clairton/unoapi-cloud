import { Request, Response, NextFunction } from 'express'
import middleware from './middleware'

export const middlewareNext: middleware = async (_req: Request, _res: Response, next: NextFunction) => next()
