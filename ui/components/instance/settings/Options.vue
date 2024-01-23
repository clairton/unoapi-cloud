<template>
  <v-card variant="outlined" :loading="loading">
    <v-card-title
      class="d-flex align-center"
      @click="toggleExpanded"
      style="cursor: pointer"
      v-ripple
    >
      <v-icon start>mdi-cellphone-cog</v-icon>
      {{ $t("options.title") }}

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

      <v-form v-model="valid">
        <div class="d-flex align-center gap-4 flex-wrap">
          <v-checkbox
            class="flex-grow-0 flex-shrink-0"
            v-model="optionsData.reject_call"
            :disabled="loading"
            :label="$t('options.rejectCall')"
            hide-details
            density="compact"
          ></v-checkbox>
          <v-text-field
            class="flex-grow-1 flex-shrink-0"
            v-model="optionsData.msg_call"
            :disabled="loading || !optionsData.reject_call"
            :label="$t('options.msgCall')"
            hide-details
            style="min-width: 200px"
          ></v-text-field>
        </div>
        <div class="d-flex gap-x-4 flex-wrap">
          <v-checkbox
            class="flex-grow-0"
            v-model="optionsData.groups_ignore"
            :disabled="loading"
            :label="$t('options.groupsIgnore')"
            hide-details
            density="compact"
          ></v-checkbox>

          <v-checkbox
            class="flex-grow-0"
            v-model="optionsData.always_online"
            :disabled="loading"
            :label="$t('options.alwaysOnline')"
            hide-details
            density="compact"
          ></v-checkbox>

          <v-checkbox
            class="flex-grow-0"
            v-model="optionsData.read_messages"
            :disabled="loading"
            :label="$t('options.readMessages')"
            hide-details
            density="compact"
          ></v-checkbox>

          <v-checkbox
            class="flex-grow-0"
            v-model="optionsData.read_status"
            :disabled="loading"
            :label="$t('options.readStatus')"
            hide-details
            density="compact"
          ></v-checkbox>
        </div>
      </v-form>
    </v-card-text>
    <v-card-actions v-if="expanded">
      <v-spacer></v-spacer>
      <v-btn
        :disabled="
          !valid ||
          JSON.stringify(optionsData) === JSON.stringify(defaultOptionsData)
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

const defaultOptions = () => ({
  reject_call: false,
  msg_call: "",
  groups_ignore: false,
  always_online: false,
  read_messages: false,
  read_status: false,
});

export default {
  name: "InstanceOptions",
  props: {
    instance: {
      type: Object,
      required: true,
    },
  },
  data: () => ({
    expanded: false,
    loading: false,
    error: false,
    valid: false,
    optionsData: {
      reject_call: false,
      msg_call: "",
      groups_ignore: false,
      always_online: false,
      read_messages: false,
      read_status: false,
    },
    defaultOptionsData: {
      reject_call: false,
      msg_call: "",
      groups_ignore: false,
      always_online: false,
      read_messages: false,
      read_status: false,
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
        await instanceController.options.set(
          this.instance.instance.instanceName,
          this.optionsData
        );
        this.defaultOptionsData = Object.assign(
          defaultOptions(),
          this.optionsData
        );
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
        const optionsData = await instanceController.options.get(
          this.instance.instance.instanceName
        );

        this.optionsData = Object.assign(defaultOptions(), optionsData);
        this.defaultOptionsData = Object.assign(defaultOptions(), optionsData);
      } catch (e) {
        this.error = e.message?.message || e.message || e;
      } finally {
        this.loading = false;
      }
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
