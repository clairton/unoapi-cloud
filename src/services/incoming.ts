export interface Incoming {
  send(phone: string, payload: object): Promise<object>
}
