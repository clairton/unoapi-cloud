<template>
  <v-app-bar flat>
    <v-app-bar-title class="flex-shrink-0">
      <v-btn variant="text" @click="$router.push({ name: 'instances' })">
        <v-img src="/unoapi_logo.png" height="42" width="42" class="mr-2" />
        UnoAPI Manager
      </v-btn>
    </v-app-bar-title>
    <v-icon v-if="AppStore.connecting" color="info">
      mdi-loading mdi-spin
    </v-icon>
    <v-chip
      v-else-if="AppStore.validConnection"
      color="success"
      style="max-width: 35vw"
      class="px-2"
    >
      <div class="d-flex align-center gap-1">
        <v-icon color="success"> mdi-check-circle </v-icon>
        <div style="display: grid">
          <p class="text-truncate">
            {{
              AppStore.connection.host
                .replace(/https?:\/\//, "")
                .replace(/\/$/, "")
            }}
          </p>
        </div>
        <v-chip size="x-small" color="grey" class="flex-shrink-0">
          <b>{{ AppStore.version }}</b>
        </v-chip>
      </div>
    </v-chip>
    <v-icon v-else color="error"> mdi-alert-circle </v-icon>
    <v-menu>
      <template v-slot:activator="{ props }">
        <v-btn class="ml-1" v-bind="props" >
          <v-icon start>mdi-translate</v-icon>
          {{ currentLanguage  }}
        </v-btn>
      </template>
      <v-list :value="currentLanguage">
        <v-list-item
          v-for="lang in availableLanguages"
          :key="lang"
          @click="changei18n(lang)"
          :disabled="lang === currentLanguage"
        >
          <v-list-item-title class="text-center">{{ lang }}</v-list-item-title>
        </v-list-item>
      </v-list>
    </v-menu>
    <v-btn @click="openSettings" icon>
      <v-icon>mdi-cog</v-icon>
    </v-btn>
    <v-btn @click="toggleTheme" icon>
      <v-icon>mdi-{{ dark ? "white-balance-sunny" : "weather-night" }}</v-icon>
    </v-btn>
  </v-app-bar>
  <SettingsModal ref="settings" />
</template>

<script>
import SettingsModal from "@/components/modal/Settings.vue";
import { useAppStore } from "@/store/app";
import { useTheme } from "vuetify";

export default {
  name: "AppBar",
  data: () => ({
    AppStore: useAppStore(),
    theme: useTheme(),
  }),
  components: {
    SettingsModal,
  },
  methods: {
    changei18n(locale) {
      this.$vuetify.locale.current = locale;
      window.localStorage.setItem("locale", locale);
    },
    toggleTheme() {
      const theme = this.theme.global.current.dark ? "light" : "dark";
      this.theme.global.name = theme;
      localStorage.setItem("theme", theme);
    },
    openSettings() {
      this.$refs.settings.open();
    },
    async loadConnectionFromUrl() {
      try {
        const { connection } = this.$route.query;
        if (!connection) return null;
        this.$router.replace({ query: {} });

        const json = atob(connection);
        const data = JSON.parse(json);
        if (!data.host || !data.globalApiKey) return null;

        await this.AppStore.setConnection(data);
        return data;
      } catch (e) {
        console.error(e);
        return null;
      }
    },
  },
  computed: {
    dark() {
      return this.theme.global.current.dark;
    },
    availableLanguages() {
      return this.$i18n.availableLocales;
    },
    currentLanguage() {
      return this.$i18n.locale;
    },
  },
  async mounted() {
    try {
      const urlConnection = await this.loadConnectionFromUrl();
      if (!urlConnection) await this.AppStore.loadConnection();
    } catch (e) {
      console.error(e);
    } finally {
      if (!this.AppStore.validConnection) this.openSettings();
    }
  },
};
</script>
