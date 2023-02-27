export interface Outgoing {
  sendMany(phone: string, messages: [any]): Promise<any>
  sendOne(phone: string, message: any): Promise<any>
}
