import express, { Application } from 'express'
import { router } from './router'
import { Incoming } from './services/incoming'
import { getDataStore } from './services/data_store'
import { getDataStoreFile } from './services/data_store_file'
import { getMediaStore } from './services/media_store'
import { getMediaStoreFile } from './services/media_store_file'
import { Outgoing } from './services/outgoing'

export class App {
  public server: Application

  constructor(
    incoming: Incoming,
    outgoing: Outgoing,
    baseUrl: string,
    getMediaStore: getMediaStore = getMediaStoreFile,
    getDataStore: getDataStore = getDataStoreFile,
  ) {
    this.server = express()
    this.middleware()
    this.router(incoming, outgoing, baseUrl, getMediaStore, getDataStore)
  }

  private middleware() {
    this.server.use(express.json())
  }

  private router(incoming: Incoming, outgoing: Outgoing, baseUrl: string, getMediaStore: getMediaStore, getDataStore: getDataStore) {
    const r = router(incoming, outgoing, baseUrl, getMediaStore, getDataStore)
    this.server.use(r)
  }
}
