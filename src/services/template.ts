import { getConfig } from './config'

export class Template {
  private getConfig: getConfig

  constructor(getConfig: getConfig) {
    this.getConfig = getConfig
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async bind(phone, name, _components) {
    const config = await this.getConfig(phone)
    const store = await config.getStore(phone, config)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const template: any = (await store.dataStore.loadTemplates()).find((t: any) => t.name == name)
    return template && template?.components[0]?.text
  }
}
