<template>
  <v-card variant="outlined" :loading="loading">
    <v-card-title
      class="d-flex align-center"
      @click="toggleExpanded"
      style="cursor: pointer"
      v-ripple
    >
      <v-icon start>mdi-account-question</v-icon>
      {{ $t("phoneHasWhatsApp.title") }}
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

      <v-text-field
        v-model="phone"
        :label="$t('phoneHasWhatsApp.phone')"
        outlined
        clearable
        variant="outlined"
        density="compact"
        class="mt-3"
        hint="DDI + DDD + Número"
      />

      <v-alert v-if="response" :type="response.exists ? 'success' : 'error'">
        {{
          response.exists
            ? $t("phoneHasWhatsApp.exists")
            : $t("phoneHasWhatsApp.notExists")
        }}

        <v-chip v-if="response.exists" text-color="white" class="ml-2">
          <b>{{ (response.jid || "").split("@")[0] }}</b>
        </v-chip>
      </v-alert>
    </v-card-text>
    <v-card-actions v-if="expanded">
      <v-spacer></v-spacer>
      <v-btn
        color="primary"
        :disabled="loading || !phone"
        :loading="loading"
        @click="verifyPhone"
        variant="tonal"
      >
        {{ $t("phoneHasWhatsApp.verify") }}
      </v-btn>
    </v-card-actions>
  </v-card>
</template>

<script>
import instanceController from "@/services/instanceController";

export default {
  name: "HasWhatsapp",
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
    response: false,
    phone: "",
  }),

  methods: {
    toggleExpanded() {
      if (this.loading) return;
      this.expanded = !this.expanded;
    },
    formatPhone(phone) {
      return phone.replace(/[^0-9]/g, "");
    },
    async verifyPhone() {
      try {
        this.loading = true;
        this.error = false;
        this.response = false;

        const phone = this.formatPhone(this.phone);
        if (phone.length < 10) throw new Error(this.$t("phoneHasWhatsApp.invalid"));

        const response = await instanceController.chat.hasWhatsapp(
          this.instance.instance.instanceName,
          [phone]
        );

        this.response = response[0];
      } catch (err) {
        this.error = err.message;
      } finally {
        this.loading = false;
      }
    },
  },

  watch: {
    expanded: {
      handler() {
        if (this.expanded) {
          this.phone = "";
          this.error = false;
          this.response = false;
        }
      },
    },
  },
};
</script>
