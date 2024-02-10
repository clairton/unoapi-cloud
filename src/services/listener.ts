export interface Listener {
  process(phone: string, messages: object[], type: 'qrcode' | 'status' | 'history' | 'append' | 'notify' | 'update' | 'delete'): Promise<void>
}
