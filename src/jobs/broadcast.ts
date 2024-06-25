import { Broadcast } from '../services/broadcast'

export class BroacastJob {
  private broadcast: Broadcast

  constructor(broadcast: Broadcast) {
    this.broadcast = broadcast
  }

  async consume(_: string, { phone, type, content }) {
    return this.broadcast.send(phone, type, content)
  }
}
