import express, { Application } from 'express'
import { Request, Response, NextFunction, Router } from 'express'

import { router } from './router'

import { getConfig } from './services/config'
import { getClient } from './services/client'
import { Incoming } from './services/incoming'
import { Outgoing } from './services/outgoing'

import middleware from './services/middleware'
import injectRoute from './services/inject_route'

export class App {
  public server: Application

  constructor(
    incoming: Incoming,
    outgoing: Outgoing,
    baseUrl: string,
    getConfig: getConfig,
    getClient: getClient,
    middleware: middleware = async (req: Request, res: Response, next: NextFunction) => next(),
    // eslint-disable-next-line @typescript-eslint/no-unused-vars, @typescript-eslint/no-empty-function
    injectRoute: injectRoute = async (router: Router) => {},
  ) {
    this.server = express()
    this.middleware()
    this.router(incoming, outgoing, baseUrl, getConfig, getClient, middleware, injectRoute)
  }

  private middleware() {
    this.server.use(express.json())
  }

  private router(
    incoming: Incoming,
    outgoing: Outgoing,
    baseUrl: string,
    getConfig: getConfig,
    getClient: getClient,
    middleware: middleware,
    injectRoute: injectRoute,
  ) {
    const roter = router(incoming, outgoing, baseUrl, getConfig, getClient, middleware, injectRoute)
    this.server.use(roter)
  }
}
