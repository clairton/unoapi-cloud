import { Router } from 'express'

export default interface router {
  (router: Router): Promise<void>
}
