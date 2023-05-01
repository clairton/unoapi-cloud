import { getConfig } from './config'

export class Template {
  private getConfig: getConfig

  constructor(getConfig: getConfig) {
    this.getConfig = getConfig
  }

  async bind(phone, name, parametersValues) {
    const config = await this.getConfig(phone)
    const store = await config.getStore(phone, config)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const template: any = (await store.dataStore.loadTemplates()).find((t: any) => t.name == name)
    if (template) {
      const types = ['header', 'body', 'footer']
      let text = ''
      types.forEach((type) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const component = template.components && template.components.find((c: any) => c.type.toLowerCase() == type)
        if (component) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const value = parametersValues.find((c: any) => c.type.toLowerCase() == type)
          if (value) {
            text = `${text}${component.text}`
            value.parameters.forEach((parameter) => {
              text = text.replace(/\{\{.*?\}\}/, parameter.text)
            })
          }
        }
      })
      return { text }
    } else {
      throw `Template name ${name} not found`
    }
  }
}
