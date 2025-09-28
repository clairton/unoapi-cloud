import { Contact, ContactResponse } from './contact'

export class ContactDummy implements Contact {
  public async verify(_phone: String, _numbers: String[], webhook: string | undefined) {
    return { contacts: [] } as ContactResponse
  }
}
