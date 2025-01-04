import { Contact, ContactResponse } from './contact';

export class ContactDummy implements Contact {
  public async verify(_phone: String, _numbers: String[]) {
    return { contacts: [] } as ContactResponse
  }
}