import { Request, Response } from 'express'
import { Incoming } from '../services/incoming'
import { Outgoing } from '../services/outgoing'

export class ConnectionController {
  private incoming: Incoming
  private outgoing: Outgoing
  constructor(incoming: Incoming, outgoing: Outgoing) {
    this.incoming = incoming
    this.outgoing = outgoing
  }
  public async create(req: Request, res: Response) {
    res.set('Content-Type', 'text/plain')
    const { phone } = req.body
    const client = await this.incoming.createClient(phone)
    if (client) {
      return res.status(200).json({ message: 'Cliente criado com sucesso' })
    } else {
      return res.status(401).json({ message: 'Numero ja registrado' })
    }
  }
  public async disconnect(req: Request, res: Response) {
    const { phone } = req.params
    const client = await this.incoming.disconnectClient(phone)
    if (client) {
      return res.status(200).json({ message: 'Cliente desconectado com sucesso!' })
    } else {
      return res.status(401).json({ message: 'Erro ao desconectar cliente!' })
    }
  }
}
