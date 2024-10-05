import { Reload } from '../services/reload'

export class ReloadJob {
  private reload: Reload

  constructor(reload: Reload) {
    this.reload = reload
  }

  async consume(_: string, { phone }: { phone: string }) {
    await this.reload.run(phone);
  }
}
