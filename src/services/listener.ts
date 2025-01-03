export type eventType = 'qrcode' | 'status' | 'history' | 'append' | 'notify' | 'update' | 'delete' | 'contacts.upsert' | 'contacts.update'

export interface Listener {
  process(phone: string, messages: object[], type: eventType): Promise<void>
}
