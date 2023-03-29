export interface Outgoing {
  sendMany(phone: string, messages: object[]): Promise<void>
  sendOne(phone: string, message: object): Promise<void>
  send(phone: string, message: object): Promise<void>
  sendHttp(phone: string, url: string, header: string, token: string, message: object): Promise<void>
}
