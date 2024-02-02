<template>
  <v-dialog v-model="dialog" max-width="350px" scrollable>
    <v-card>
      <v-card-text>
        <div class="d-flex flex-column align-center">
          <h4>{{$t('contribute.via')}} PIX</h4>
          <v-img
            src="@/assets/qrcode-pix.png"
            height="300px"
            width="300px"
            class="mb-2"
          />

          <v-chip @click="copy" size="small">
            {{ key }}
            <v-icon end size="small" v-if="!copied">mdi-content-copy</v-icon>
            <v-icon end size="small" v-else>mdi-check</v-icon>
          </v-chip>
        </div>
      </v-card-text>
      <v-card-actions>
        <v-spacer></v-spacer>
        <v-btn text @click="dialog = false" :disabled="loading"> {{ $t('close') }} </v-btn>
        <v-spacer></v-spacer>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script>
import copyToClipboard from "@/helpers/copyToClipboard";

export default {
  name: "SettingsModal",
  data: () => ({
    key: "0e42d192-f4d6-4672-810b-41d69eba336e",
    dialog: false,
    copied: false,
    isHttps: window.location.protocol === "https:",
  }),
  methods: {
    copy() {
      if (this.copied) return;

      copyToClipboard(this.key);
      
      this.copied = true;
      setTimeout(() => {
        this.copied = false;
      }, 2000);
    },
    open() {
      this.dialog = true;
    },
  },
};
</script>
