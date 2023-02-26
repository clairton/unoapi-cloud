import express, { Application } from 'express'

import { router } from './router'
import { Incoming } from './services/incoming'

export class App {
  public server: Application

  constructor(service: Incoming) {
    this.server = express()
    this.middleware()
    this.router(service)
  }

  private middleware() {
    this.server.use(express.json())
  }

  private router(service: Incoming) {
    const r = router(service)
    this.server.use(r)
  }
}
