import express, { Application } from 'express'
import { router } from './router'
import { Incoming } from './services/incoming'
import { getDataStore } from './services/data_store'
import { getDataStoreFile } from './services/data_store_file'
import { getMediaStore } from './services/media_store'
import { getMediaStoreFile } from './services/media_store_file'
import { Outgoing } from './services/outgoing'
import middleware from './services/middleware'
import injectRoute from './services/inject_route'
import { Request, Response, NextFunction, Router } from 'express'

export class App {
  public server: Application

  constructor(
    incoming: Incoming,
    outgoing: Outgoing,
    baseUrl: string,
    getMediaStore: getMediaStore = getMediaStoreFile,
    getDataStore: getDataStore = getDataStoreFile,
    middleware: middleware = async (req: Request, res: Response, next: NextFunction) => next(),
    // eslint-disable-next-line @typescript-eslint/no-unused-vars, @typescript-eslint/no-empty-function
    injectRoute: injectRoute = async (router: Router) => {},
  ) {
    this.server = express()
    this.middleware()
    this.router(incoming, outgoing, baseUrl, getMediaStore, getDataStore, middleware, injectRoute)
  }

  private middleware() {
    this.server.use(express.json())
  }

  private async router(
    incoming: Incoming,
    outgoing: Outgoing,
    baseUrl: string,
    getMediaStore: getMediaStore,
    getDataStore: getDataStore,
    middleware: middleware,
    injectRoute: injectRoute,
  ) {
    const roter = await router(incoming, outgoing, baseUrl, getMediaStore, getDataStore, middleware, injectRoute)
    this.server.use(roter)
  }
}
