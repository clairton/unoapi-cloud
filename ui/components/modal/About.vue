<template>
  <v-dialog v-model="dialog" max-width="600px" scrollable>
    <v-card>
      <v-card-text>
        <div class="d-flex flex-column align-center">
          <v-img
            src="@/assets/logo_green.png"
            height="100"
            width="250"
          />
          <h3 class="mt-5 mb-2">UnoAPI Manager</h3>
          <p class="text-center">
            {{ $t("about.description") }}
          </p>
          <div
            class="d-flex gap-x-2 gap-y-1 align-center justify-center mt-5 flex-wrap"
          >
            <v-btn
              href="https://github.com/clairton/unoapi-cloud"
              target="_blank"
              color="grey-darken-3"
            >
              <v-icon start>mdi-github</v-icon>
              GitHub
            </v-btn>
            <v-btn @click="contribute" color="light-blue">
              <v-icon start>mdi-hand-coin</v-icon>
              {{ $t("about.contribute") }}
            </v-btn>
          </div>

          <h3 class="mt-5 mb-2">{{ $t("about.dataProcess.title") }}</h3>
          <p class="text-center" v-html="$t('about.dataProcess.description')" />
          <v-alert v-if="isHttps" color="info" class="mt-2" variant="tonal">
            {{ $t("about.dataProcess.https") }}
          </v-alert>

          <span class="mt-5 mb-0 text-disabled">Versão: {{ version }}</span>
        </div>
      </v-card-text>
      <v-card-actions>
        <v-spacer></v-spacer>
        <v-btn text @click="dialog = false" block :disabled="loading">
          Fechar
        </v-btn>
        <v-spacer></v-spacer>
      </v-card-actions>
    </v-card>
  </v-dialog>
  <contribute ref="contribute" />
</template>

<script>
import Contribute from "./Contribute.vue";

import { version } from "../../../package.json";

export default {
  name: "SettingsModal",
  data: () => ({
    dialog: false,
    version,
    isHttps: window.location.protocol === "https:",
  }),
  methods: {
    contribute() {
      this.$refs.contribute.open();
    },
    open() {
      this.dialog = true;
    },
  },
  components: { Contribute },
};
</script>
