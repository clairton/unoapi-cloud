<template>
  <v-card variant="outlined" :loading="loading">
    <v-card-title
      class="d-flex align-center"
      @click="toggleExpanded"
      style="cursor: pointer"
      v-ripple
    >
      <v-icon start>mdi-rabbit</v-icon>
      RabbitMQ

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

      <v-alert type="info" class="mb-3">
        {{ $t("rabbitmq.info") }}
      </v-alert>

      <v-form v-model="valid">
        <v-select
          :items="rabbitmqEventsType"
          v-model="rabbitmqData.events"
          :disabled="loading"
          :label="$t('events')"
          hide-details
          class="mb-3"
          multiple
          outlined
          dense
          chips
        />
      </v-form>
    </v-card-text>
    <v-card-actions v-if="expanded">
      <v-switch
        v-model="rabbitmqData.enabled"
        :label="$t('enabled')"
        color="primary"
        :disabled="loading"
        hide-details
      ></v-switch>
      <v-spacer></v-spacer>
      <v-btn
        :disabled="
          !valid ||
          JSON.stringify(rabbitmqData) === JSON.stringify(defaultRabbitmqData)
        "
        :loading="loading"
        color="primary"
        @click="saveRabbitmq"
        variant="tonal"
      >
        {{ $t("save") }}
    </v-btn>
    </v-card-actions>
  </v-card>
</template>

<script>
import instanceController from "@/services/instanceController";

export default {
  name: "InstanceRabbitmq",
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
    rabbitmqData: {
      enabled: false,
      events: [],
    },
    defaultRabbitmqData: {
      enabled: false,
      events: [],
    },
    rabbitmqEventsType: [
      "APPLICATION_STARTUP",
      "QRCODE_UPDATED",
      "MESSAGES_SET",
      "MESSAGES_UPSERT",
      "MESSAGES_UPDATE",
      "MESSAGES_DELETE",
      "SEND_MESSAGE",
      "CONTACTS_SET",
      "CONTACTS_UPSERT",
      "CONTACTS_UPDATE",
      "PRESENCE_UPDATE",
      "CHATS_SET",
      "CHATS_UPSERT",
      "CHATS_UPDATE",
      "CHATS_DELETE",
      "GROUPS_UPSERT",
      "GROUP_UPDATE",
      "GROUP_PARTICIPANTS_UPDATE",
      "CONNECTION_UPDATE",
      "CALL",
      "NEW_JWT_TOKEN",
    ],
  }),

  methods: {
    toggleExpanded() {
      if (this.loading) return;
      this.expanded = !this.expanded;
    },
    async saveRabbitmq() {
      try {
        this.loading = true;
        this.error = false;
        await instanceController.rabbitmq.set(
          this.instance.instance.instanceName,
          this.rabbitmqData
        );
        this.defaultRabbitmqData = Object.assign({}, this.rabbitmqData);
      } catch (e) {
        this.error = e.message?.message || e.message || e;
      } finally {
        this.loading = false;
      }
    },

    async loadRabbitmq() {
      try {
        this.loading = true;
        this.error = false;
        const rabbitmqData = await instanceController.rabbitmq.get(
          this.instance.instance.instanceName
        );

        this.rabbitmqData = Object.assign({}, rabbitmqData);
        this.defaultRabbitmqData = Object.assign({}, rabbitmqData);
      } catch (e) {
        this.error = e.message?.message || e.message || e;
      } finally {
        this.loading = false;
      }
    },
  },

  watch: {
    expanded(val) {
      if (val) this.loadRabbitmq();
    },
  },
};
</script>

<style></style>
