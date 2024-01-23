<template>
  <v-app-bar flat>
    <v-app-bar-title class="flex-shrink-0">
      <v-btn @click="drawer = !drawer" icon>
        <v-icon>mdi-menu</v-icon>
      </v-btn>
      <v-btn variant="text" @click="$router.push({ name: 'doc' })">
        <v-img src="@/assets/logo.png" height="24" width="24" class="mr-2" />
        Evolution Doc
      </v-btn>
    </v-app-bar-title>
    <v-btn :to="{ name: 'instances' }"> Instâncias </v-btn>
    <v-btn @click="toggleTheme" icon>
      <v-icon>mdi-{{ dark ? "white-balance-sunny" : "weather-night" }}</v-icon>
    </v-btn>
  </v-app-bar>

  <v-navigation-drawer :width="300" v-model="drawer">
    <v-select
      :value="lang"
      :items="lang_list"
      item-text="text"
      item-value="value"
      density="compact"
      hide-details="auto"
      class="ma-1"
      @update:model-value="DocStore.setLang"
    />
    <v-list-item
      title="Documentação"
      subtitle="Evolution-Manager"
    ></v-list-item>
    <v-divider></v-divider>
    <v-list-item
      link
      :title="doc.title || doc.filename || doc.path"
      v-for="(doc, i) in docs"
      :key="i"
      :to="{ name: 'doc', params: { doc: doc.filename || doc.path } }"
    />
  </v-navigation-drawer>
</template>

<script>
import { useTheme } from "vuetify";
import { useDocStore } from "@/store/doc";
export default {
  name: "AppBar",
  data: () => ({
    theme: useTheme(),
    drawer: false,
    lang_list: [
      { title: "Português", value: "pt_br" },
      { title: "English", value: "en" },
    ],
    DocStore: useDocStore(),
  }),
  methods: {
    toggleTheme() {
      const theme = this.theme.global.current.dark ? "light" : "dark";
      this.theme.global.name = theme;
      localStorage.setItem("theme", theme);
    },
  },
  computed: {
    lang() {
      return this.DocStore.lang;
    },
    docs() {
      return Object.values(this.DocStore.docs).map((doc) => doc[this.lang]).filter((doc) => doc);
    },
    dark() {
      return this.theme.global.current.dark;
    },
  },
  mounted() {
    this.DocStore.loadDocs();
  },
};
</script>
