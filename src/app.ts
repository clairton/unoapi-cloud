import express, { Application } from 'express'
import morgan from 'morgan'
import { router } from './router'
import { Incoming } from './services/incoming'
import { getDataStore } from './services/get_data_store'

export class App {
  public server: Application

  constructor(service: Incoming, baseUrl: string, getDataStore: getDataStore) {
    this.server = express()
    this.middleware()
    this.router(service, baseUrl, getDataStore)
    this.server.use(morgan('combined'))
  }

  private middleware() {
    this.server.use(express.json())
  }

  private router(service: Incoming, baseUrl: string, getDataStore: getDataStore) {
    const r = router(service, baseUrl, getDataStore)
    this.server.use(r)
  }
}
