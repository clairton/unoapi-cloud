<template>
  <v-card variant="outlined" :loading="loading">
    <v-card-title
      class="d-flex align-center"
      @click="toggleExpanded"
      style="cursor: pointer"
      v-ripple
    >
      <v-icon start>mdi-email-fast</v-icon>
      Websocket
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
        <v-select
          :items="websocketEventsType"
          v-model="websocketData.events"
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
        v-model="websocketData.enabled"
        :label="$t('enabled')"
        color="primary"
        :disabled="loading"
        hide-details
      ></v-switch>
      <v-spacer></v-spacer>
      <v-btn
        :disabled="
          !valid ||
          JSON.stringify(websocketData) === JSON.stringify(defaultWebsocketData)
        "
        :loading="loading"
        color="primary"
        @click="saveWebsocket"
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
  name: "InstanceWebsocket",
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
    websocketData: {
      enabled: false,
      events: [],
    },
    defaultWebsocketData: {
      enabled: false,
      events: [],
    },
    websocketEventsType: [
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
    async saveWebsocket() {
      try {
        this.loading = true;
        this.error = false;
        await instanceController.websocket.set(
          this.instance.instance.instanceName,
          this.websocketData
        );
        this.defaultWebsocketData = Object.assign({}, this.websocketData);
      } catch (e) {
        this.error = e.message?.message || e.message || e;
      } finally {
        this.loading = false;
      }
    },

    async loadWebsocket() {
      try {
        this.loading = true;
        this.error = false;
        const websocketData = await instanceController.websocket.get(
          this.instance.instance.instanceName
        );

        this.websocketData = Object.assign({}, websocketData);
        this.defaultWebsocketData = Object.assign({}, websocketData);
      } catch (e) {
        this.error = e.message?.message || e.message || e;
      } finally {
        this.loading = false;
      }
    },
  },

  watch: {
    expanded: {
      handler() {
        if (this.expanded) this.loadWebsocket();
      },
    },
  },
};
</script>

<style></style>
