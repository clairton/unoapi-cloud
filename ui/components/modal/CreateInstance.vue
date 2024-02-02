<template>
  <v-dialog v-model="dialog" max-width="500px">
    <v-card>
      <v-card-text class="d-flex flex-column gap-4">
        <v-form v-model="valid">
          <h3 class="mb-4">{{ $t("createInstance.title") }}</h3>
          <v-text-field
            v-model="instance.instanceName"
            :label="$t('createInstance.name')"
            required
            outlined
            :rules="[
              (v) =>
                !!v || $t('required', { field: $t('createInstance.name') }),
              (v) =>
                new RegExp('^[a-zA-Z0-9_-]*$', 'i').test(v) ||
                'Nome inválido (apenas letras, números, _ e -)',
            ]"
          />
          <v-text-field
            v-model="instance.token"
            label="API Key"
            required
            outlined
            @click:prepend-inner="generateApiKey"
            prepend-inner-icon="mdi-lock-reset"
            :rules="[
              // Verify is not have any caracter except letters, numbers, _ and -
              (v) =>
                new RegExp('^[a-zA-Z0-9_-]*$', 'i').test(v) ||
                'Nome inválido (apenas letras, números, _ e -)',
            ]"
          />
        </v-form>

        <v-alert type="info" density="comfortable">
          {{ $t("createInstance.configInfo") }}
        </v-alert>

        <v-alert type="error" v-if="error">
          {{ Array.isArray(error) ? error.join(", ") : error }}
        </v-alert>
      </v-card-text>
      <v-card-actions>
        <v-btn text @click="dialog = false" :disabled="loading">
          {{ $t("cancel") }}
        </v-btn>
        <v-spacer></v-spacer>
        <v-btn
          color="success"
          variant="tonal"
          @click="save"
          :disabled="!valid"
          :loading="loading"
        >
          {{ $t("save") }}
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script>
import instanceController from "@/services/instanceController";
import { useAppStore } from "@/store/app";

export default {
  name: "SettingsModal",
  data: () => ({
    dialog: false,
    valid: false,
    instance: {
      instanceName: "",
      token: "",
    },
    loading: false,
    error: false,
    AppStore: useAppStore(),
  }),
  methods: {
    generateApiKey() {
      this.instance.token =
        Math.random().toString(36).substring(2, 15) +
        Math.random().toString(36).substring(2, 15);
    },
    async save() {
      try {
        this.loading = true;
        this.error = false;

        const instance = await instanceController.create(this.instance);
        await this.AppStore.reconnect();

        this.$router.push({
          name: "instance",
          params: { id: instance.instance.instanceName },
        });
      } catch (e) {
        this.error = e.message?.message || e.message || e;
      } finally {
        this.loading = false;
      }
    },
    open() {
      this.dialog = true;
      this.error = false;
      this.instance.instanceName = "";
      this.generateApiKey();
    },
  },

  emits: ["close"],
};
</script>
