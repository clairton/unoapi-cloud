import express, { Application } from 'express'
import { router } from './router'
import { Incoming } from './services/incoming'
import { getDataStore } from './services/data_store'
import { getDataStoreFile } from './services/data_store_file'
import { Outgoing } from './services/outgoing'

export class App {
  public server: Application

  constructor(incoming: Incoming, outgoing: Outgoing, baseUrl: string, getDataStore: getDataStore = getDataStoreFile) {
    this.server = express()
    this.middleware()
    this.router(incoming, outgoing, baseUrl, getDataStore)
  }

  private middleware() {
    this.server.use(express.json())
  }

  private router(incoming: Incoming, outgoing: Outgoing, baseUrl: string, getDataStore: getDataStore) {
    const r = router(incoming, outgoing, baseUrl, getDataStore)
    this.server.use(r)
  }
}
