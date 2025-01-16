import { I18n, TranslateOptions } from 'i18n'
import path from 'path'
import { DEFAULT_LOCALE } from './defaults'

const i18n = new I18n({
  locales: ['en', 'pt_BR'],
  defaultLocale: DEFAULT_LOCALE,
  directory: path.join(__dirname, 'locales'),
  updateFiles: false,
})

i18n.setLocale(DEFAULT_LOCALE)

export const t =  (phraseOrOptions: string | TranslateOptions, ...replace: any[]) => {
  const string = i18n.__(phraseOrOptions, ...replace)
  return string
}