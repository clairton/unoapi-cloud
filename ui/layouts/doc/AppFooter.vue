<template>
  <v-footer absolute app class="mt-10">
    <div class="d-flex flex-grow-1 flex-wrap gap-y-1 align-end">
      <div class="flex-shrink-0 d-flex gap-2 align-center">
        <v-btn
        @click="about"
        variant="tonal"
          size="small"
          color="blue"
          >
          <v-icon start> mdi-information </v-icon>
          Sobre
        </v-btn>
        <v-btn
        @click="contribute"
          variant="tonal"
          size="small"
          color="light-blue-lighten-1"
        >
          <v-icon start>mdi-hand-coin</v-icon>
          Contribua com o Projeto
        </v-btn>
        <p style="font-size: 12px" class="text-disabled">v{{ version }}</p>
      </div>
    </div>
  </v-footer>
  <Contribute ref="contribute" />
  <About ref="about" />
</template>

<script>
import About from "@/components/modal/About.vue";
import Contribute from "@/components/modal/Contribute.vue";

import { version } from "../../../package.json";

export default {
  name: "AppFooter",
  data: () => ({
    version,
  }),
  methods: {
    about() {
      this.$refs.about.open();
    },
    contribute() {
      this.$refs.contribute.open();
    },
  },
  components: { Contribute, About },
};
</script>

<style></style>
