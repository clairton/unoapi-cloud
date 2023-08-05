export interface Outgoing {
  sendMany(phone: string, messages: object[]): Promise<void>
  sendOne(phone: string, message: object, isQrCode?: boolean, qrCodeUrl?: string): Promise<void>
  send(phone: string, message: object): Promise<void>
  sendHttp(phone: string, url: string, header: string, token: string, message: object): Promise<void>
  sendQrCode(phone: string, message: string): Promise<void>
  sendChangeStatusHttp(phone: string, status: string): Promise<void>
}
