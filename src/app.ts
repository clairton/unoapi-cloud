import express from 'express'
import { createServer, Server as HttpServer } from 'http'
import { Request, Response, NextFunction, Router } from 'express'
import { router } from './router'
import { getConfig } from './services/config'
import { Incoming } from './services/incoming'
import { Outgoing } from './services/outgoing'
import { SessionStore } from './services/session_store'
import middleware from './services/middleware'
import injectRoute from './services/inject_route'
import { OnNewLogin } from './services/socket'
import { Server } from 'socket.io'
import { addToBlacklist } from './services/blacklist'

export class App {
  public readonly server: HttpServer
  private app

  constructor(
    incoming: Incoming,
    outgoing: Outgoing,
    baseUrl: string,
    getConfig: getConfig,
    sessionStore: SessionStore,
    onNewLogin: OnNewLogin,
    addToBlacklist: addToBlacklist,
    middleware: middleware = async (req: Request, res: Response, next: NextFunction) => next(),
    // eslint-disable-next-line @typescript-eslint/no-unused-vars, @typescript-eslint/no-empty-function
    injectRoute: injectRoute = async (router: Router) => {},
  ) {
    this.app = express()
    this.app.use(express.json())
    this.app.use(express.urlencoded({ extended: true }))
    this.server = createServer(this.app)
    const socket: Server = new Server(this.server)
    this.router(incoming, outgoing, baseUrl, getConfig, sessionStore, socket, onNewLogin, addToBlacklist, middleware, injectRoute)
  }

  private router(
    incoming: Incoming,
    outgoing: Outgoing,
    baseUrl: string,
    getConfig: getConfig,
    sessionStore: SessionStore,
    socket: Server,
    onNewLogin: OnNewLogin,
    addToBlacklist: addToBlacklist,
    middleware: middleware,
    injectRoute: injectRoute,
  ) {
    const roter = router(incoming, outgoing, baseUrl, getConfig, sessionStore, socket, onNewLogin, addToBlacklist, middleware, injectRoute)
    this.app.use(roter)
  }
}
