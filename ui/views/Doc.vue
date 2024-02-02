<template>
  <v-card elevation="0" :loading="loading">
    <VMarkdownView
      v-if="!error"
      :mode="dark ? 'dark' : 'light'"
      :content="content"
    ></VMarkdownView>

    <div v-else>
      <v-alert type="error" outlined>
        {{ error }}
      </v-alert>
    </div>
  </v-card>
</template>

<script>
import { VMarkdownView } from "vue3-markdown";
import "vue3-markdown/dist/style.css";
import { useDocStore } from "@/store/doc";
import { useTheme } from "vuetify";

export default {
  components: {
    VMarkdownView,
  },
  data: () => ({
    drawer: false,
    theme: useTheme(),
    lang_list: [
      { title: "Português", value: "pt_br" },
      { title: "English", value: "en" },
    ],
    DocStore: useDocStore(),
    content: "",
    error: false,
    loading: false,
  }),
  methods: {
    async loadDoc(doc) {
      try {
        this.loading = true;
        this.error = false;
        const { content } = await this.DocStore.loadDoc(doc || "index");
        this.content = content;
      } catch (e) {
        this.error = e;
      } finally {
        this.loading = false;
      }
    },
  },
  watch: {
    $route() {
      this.loadDoc(this.$route.params.doc);
    },
    lang() {
      this.loadDoc(this.$route.params.doc);
    },
  },
  computed: {
    lang() {
      return this.DocStore.lang;
    },
    docs() {
      return this.DocStore.docs;
    },
    dark() {
      return this.theme?.global?.current?.dark;
    },
  },
  mounted() {
    this.loadDoc(this.$route.params.doc);
  },
};
</script>

<style>
.markdown-body[data-theme="dark"] {
  background-color: #121212 !important;
  color: #fff !important;
}
</style>
