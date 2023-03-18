export interface Outgoing {
  sendMany(phone: string, messages: object[]): Promise<void>
  sendOne(phone: string, message: object): Promise<void>
  send(phone: string, message: object): Promise<void>
}
