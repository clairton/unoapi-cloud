import { Store } from './store'

export interface getStore {
  (phone: string): Promise<Store>
}
