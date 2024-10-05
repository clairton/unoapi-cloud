export interface Logout {
  run(phone: string): Promise<void>
}
