/**
 * plugins/index.js
 *
 * Automatically included in `./src/main.js`
 */

// Plugins
import { vuetify, i18n } from './vuetify'
import pinia from '../store'
import router from '../router'

import HelpTooltip from '@/components/global/HelpTooltip.vue'

export function registerPlugins(app) {
  app.use(i18n).use(vuetify).use(router).use(pinia).component('HelpTooltip', HelpTooltip)
}
