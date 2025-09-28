import { Server } from 'socket.io'

export class Broadcast {
  private server: Server

  public setSever(server: Server) {
    this.server = server
  }

  public async send(phone: string, type: string, content: string) {
    if (!this.server) {
      throw 'Set the socket server'
    }
    await this.server.emit('broadcast', { phone, type, content })
  }
}
