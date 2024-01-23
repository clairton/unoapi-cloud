/**
 * plugins/vuetify.js
 *
 * Framework documentation: https://vuetifyjs.com`
 */

// Styles
import '@mdi/font/css/materialdesignicons.css'
import 'vuetify/styles'

// Composables
import { createVuetify } from 'vuetify'
import { createVueI18nAdapter } from 'vuetify/locale/adapters/vue-i18n'
import { createI18n, useI18n } from 'vue-i18n'

// import all files from src/i18n
const messages = Object.fromEntries(
  Object.entries(import.meta.glob('../i18n/*.js', { eager: true })).map(([key, value]) => {
    const locale = key.match(/([A-Za-z0-9-_]+)\./i)[1]
    return [locale, value.default]
  }),
)

const locale = window.localStorage.getItem('locale') || 'pt'
export const i18n = createI18n({
  legacy: false, // Vuetify does not support the legacy mode of vue-i18n
  locale,
  fallbackLocale: 'pt',
  messages,
})

const defaultTheme = localStorage.getItem('theme') || 'light'
export const vuetify = createVuetify({
  locale: {
    adapter: createVueI18nAdapter({ i18n, useI18n }),
  },
  theme: {
    defaultTheme,
    themes: {
      light: {
        colors: {
          primary: '#1867C0',
          secondary: '#5CBBF6',
        },
      },
    },
  },
})

export default {
  vuetify,
  i18n,
}
