export interface LogoutOptions {
  force?: boolean
}

export interface Logout {
  run(phone: string, options?: LogoutOptions): Promise<void>
}
