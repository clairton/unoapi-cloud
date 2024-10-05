import { Logout } from '../services/logout'

export class LogoutJob {
  private logout: Logout

  constructor(logout: Logout) {
    this.logout = logout
  }

  async consume(_: string, { phone }: { phone: string }) {
    this.logout.run(phone)
  }
}
