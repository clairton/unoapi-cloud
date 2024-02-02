<template>
  <v-dialog v-model="dialog" max-width="700px" scrollable>
    <v-card>
      <v-card-title>{{ $t("chatwoot.config.title") }}</v-card-title>

      <v-card-text>
        <p>
          <b>{{ $t("step", { step: 1 }) }}:</b>
          {{ $t("chatwoot.config.steps.1") }}
        </p>
        <p class="mt-2">
          <b>{{ $t("step", { step: 2 }) }}:</b>
          {{ $t("chatwoot.config.steps.2") }}

          <v-img src="@/assets/chatwoot/chatwoot_api.png" class="ma-4 elevation-10" />
        </p>

        <p class="mt-2 mb-1">
          <b>{{ $t("step", { step: 3 }) }}:</b>
          {{ $t("chatwoot.config.steps.3") }}
        </p>
        <div class="d-flex flex-wrap gap-2">
          <v-text-field
            v-model="instanceName"
            label="Name"
            readonly
            variant="solo-filled"
            hide-details
            density="compact"
            :prepend-inner-icon="
              copy.instanceName ? 'mdi-check' : 'mdi-content-copy'
            "
            @click="copyValue('instanceName')"
            @click:prepend-inner="copyValue('instanceName')"
          />
          <v-text-field
            v-model="webhook"
            label="Webhook"
            readonly
            variant="solo-filled"
            hide-details
            density="compact"
            :prepend-inner-icon="
              copy.webhook ? 'mdi-check' : 'mdi-content-copy'
            "
            @click="copyValue('webhook')"
            @click:prepend-inner="copyValue('webhook')"
          />
        </div>
        <v-img src="@/assets/chatwoot/chatwoot_api_1.png" />

        <!-- Step 4: Add agents to the inbox. -->
        <p>
          <b>{{ $t("step", { step: 4 }) }}</b>
          {{ $t("chatwoot.config.steps.4") }}
        </p>
        <v-img src="@/assets/chatwoot/chatwoot_api_2.png" />

        <!-- Step 5: Ready. -->
        <p>
          <b>{{ $t("step", { step: 5 }) }}</b>
          {{ $t("chatwoot.config.steps.5") }}
        </p>
        <v-img src="@/assets/chatwoot/chatwoot_api_3.png" />

        <v-btn
          variant="text"
          block
          href="https://www.chatwoot.com/docs/product/channels/api/create-channel"
          target="_blank"
        >
          {{ $t("chatwoot.config.fullDoc") }}
        </v-btn>
      </v-card-text>
      <v-card-actions>
        <v-spacer></v-spacer>
        <v-btn text @click="dialog = false"> {{ $t("close") }} </v-btn>
        <v-spacer></v-spacer>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script>
import { useAppStore } from "@/store/app";
import copyToClipboard from "@/helpers/copyToClipboard";
export default {
  name: "SettingsModal",
  data: () => ({
    dialog: false,
    AppStore: useAppStore(),
    copy: {
      webhook: false,
      instanceName: false,
    },
  }),
  methods: {
    open() {
      this.dialog = true;
    },
    copyValue(key) {
      copyToClipboard(this[key]);

      this.copy[key] = true;
      setTimeout(() => {
        this.copy[key] = false;
      }, 5000);
    },
  },
  computed: {
    instanceName() {
      return this.instance.instance.instanceName;
    },
    webhook() {
      const url = new URL(this.AppStore.connection.host);

      return `${url.origin}/chatwoot/webhook/${this.instanceName}`;
    },
  },
  props: {
    instance: {
      type: Object,
      required: true,
    },
  },

  emits: ["close"],
};
</script>
