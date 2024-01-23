<template>
  <v-card variant="outlined" :loading="loading">
    <v-card-title
      class="d-flex align-center"
      @click="toggleExpanded"
      style="cursor: pointer"
      v-ripple
    >
      <v-icon start>mdi-account</v-icon>
      {{ $t("profile.title") }}

      <v-spacer></v-spacer>
      <v-btn
        size="small"
        icon
        :disabled="loading"
        variant="tonal"
        @click.stop="toggleExpanded"
        :style="{ transform: expanded ? 'rotate(180deg)' : '' }"
      >
        <v-icon>mdi-chevron-down</v-icon>
      </v-btn>
    </v-card-title>
    <v-card-text v-if="expanded">
      <v-alert v-if="error" type="error" class="mb-3">
        {{ error }}
      </v-alert>

      <v-form v-model="valid" class="d-flex flex-column gap-2">
        <v-text-field
          class="flex-grow-1 flex-shrink-0"
          v-model="data.name"
          :disabled=" loading"
          :label="$t('profile.name')"
          counter
          maxlength="25"
          :rules="[
            (v) => !!v || $t('required', { field: $t('profile.name') }),
            (v) => v.length <= 25 || $t('maxLength', { field: $t('profile.name'), length: 25 }),
          ]"
        ></v-text-field>
        <v-text-field
          class="flex-grow-1 flex-shrink-0"
          v-model="data.status"
          :disabled="loading"
          :label="$t('profile.status')"
          :rules="[
            (v) => !!v || $t('required', { field: $t('profile.status') }),
            (v) =>
              v.length <= 139 || $t('maxLength', { field: $t('profile.status'), length: 139 }),
          ]"
          counter
          maxlength="139"
        ></v-text-field>
      </v-form>
    </v-card-text>
    <v-card-actions v-if="expanded">
      <v-spacer></v-spacer>
      <v-btn
        :disabled="
          !valid ||
          JSON.stringify(data) === JSON.stringify(defaultData) ||
          !isOpen
        "
        :loading="loading"
        color="primary"
        @click="saveOptions"
        variant="tonal"
      >
        {{ $t("save") }}
      </v-btn>
    </v-card-actions>
  </v-card>
</template>

<script>
import instanceController from "@/services/instanceController";
import { useAppStore } from "@/store/app";
export default {
  name: "BasicInfo",
  props: {
    instance: {
      type: Object,
      required: true,
    },
  },
  data: () => ({
    AppStore: useAppStore(),

    expanded: false,
    loading: false,
    error: false,
    valid: false,
    data: {
      name: "",
      status: "",
    },
    defaultData: {
      name: "",
      status: "",
    },
  }),

  methods: {
    toggleExpanded() {
      if (this.loading) return;
      this.expanded = !this.expanded;
    },
    async saveOptions() {
      try {
        this.loading = true;
        this.error = false;

        if (!this.isOpen) return;

        if (this.data.name !== this.defaultData.name)
          await instanceController.profile.updateName(
            this.instance.instance.instanceName,
            this.data.name
          );

        if (this.data.status !== this.defaultData.status)
          await instanceController.profile.updateStatus(
            this.instance.instance.instanceName,
            this.data.status
          );

        await this.AppStore.reconnect();
        this.loadOptions();
      } catch (e) {
        this.error = e.message?.message || e.message || e;
      } finally {
        this.loading = false;
      }
    },

    async loadOptions() {
      try {
        this.loading = true;
        this.error = false;
        const instance = this.instance.instance;
        const { isOpen } = this;
        var data = {
          name: isOpen ? instance.profileName.replace("not loaded", "") || "" : "",
          status: isOpen ? instance.profileStatus || "" : "",
        };

        this.data = Object.assign({}, data);
        this.defaultData = Object.assign({}, data);
      } catch (e) {
        this.error = e.message?.message || e.message || e;
      } finally {
        this.loading = false;
      }
    },
  },

  computed: {
    isOpen() {
      return this.instance.instance.status === "open";
    },
  },
  watch: {
    expanded(val) {
      if (val) this.loadOptions();
    },
  },
};
</script>

<style></style>
