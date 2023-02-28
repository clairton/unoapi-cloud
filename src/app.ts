import express, { Application } from 'express'
import morgan from 'morgan'
import { router } from './router'
import { Incoming } from './services/incoming'

export class App {
  public server: Application

  constructor(service: Incoming) {
    this.server = express()
    this.middleware()
    this.router(service)
    this.server.use(morgan('combined'))
  }

  private middleware() {
    this.server.use(express.json())
  }

  private router(service: Incoming) {
    const r = router(service)
    this.server.use(r)
  }
}
