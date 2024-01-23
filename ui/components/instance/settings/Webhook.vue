<template>
  <v-card variant="outlined" :loading="loading">
    <v-card-title
      class="d-flex align-center"
      @click="toggleExpanded"
      style="cursor: pointer"
      v-ripple
    >
      <v-icon start>mdi-webhook</v-icon>
      Webhook
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
        <v-text-field
          v-model="webhookData.url"
          label="URL"
          :disabled="loading"
          outlined
          dense
          hide-details="auto"
          class="mb-3"
          :rules="[
            (url) => {
              if (!url) return this.$t('required', { field: 'URL' });
              if (!url.startsWith('http'))
                return this.$t('httpHttps', { field: 'URL' });
              return true;
            },
          ]"
        />

        <v-select
          :items="webhookEventsType"
          v-model="webhookData.events"
          :disabled="loading"
          :label="$t('events')"
          hide-details
          class="mb-3"
          multiple
          outlined
          dense
          chips
        />

        <div class="d-flex gap-x-4 flex-wrap align-center">
          <div>
            <v-checkbox
              v-model="webhookData.webhook_base64"
              :disabled="loading"
              label="Webhook base64"
              hide-details
              class="mb-3"
              density="compact"
            />
          </div>
          <div>
            <v-checkbox
              v-model="webhookData.webhook_by_events"
              :disabled="loading"
              hide-details
              class="mb-3"
              density="compact"
            >
              <template v-slot:label>
                <span>{{ $t("webhook.byEvents") }}</span>
                <HelpTooltip>
                  {{ $t("webhook.byEventsHelp") }}
                </HelpTooltip>
              </template>
            </v-checkbox>
          </div>
        </div>
      </v-form>
    </v-card-text>
    <v-card-actions v-if="expanded">
      <v-switch
        v-model="webhookData.enabled"
        :label="$t('enabled')"
        color="primary"
        :disabled="loading"
        hide-details
      ></v-switch>
      <v-spacer></v-spacer>
      <v-btn
        :disabled="
          !valid ||
          JSON.stringify(webhookData) === JSON.stringify(defaultWebhookData)
        "
        :loading="loading"
        color="primary"
        @click="saveWebhook"
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
  name: "InstanceWebhook",
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
    webhookData: {
      enabled: false,
      events: [],
      url: "",
      webhook_base64: false,
      webhook_by_events: false,
    },
    defaultWebhookData: {
      enabled: false,
      events: [],
      url: "",
      webhook_base64: false,
      webhook_by_events: false,
    },
    webhookEventsType: [
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
    async saveWebhook() {
      try {
        this.loading = true;
        this.error = false;
        await instanceController.webhook.set(
          this.instance.instance.instanceName,
          {
            ...this.webhookData,
            url: this.webhookData.url.trim().replace(/\/$/, ""),
          }
        );
        this.defaultWebhookData = Object.assign({}, this.webhookData);
      } catch (e) {
        this.error = e.message?.message || e.message || e;
      } finally {
        this.loading = false;
      }
    },

    async loadWebhook() {
      try {
        this.loading = true;
        this.error = false;
        const webhookData = await instanceController.webhook.get(
          this.instance.instance.instanceName
        );

        this.webhookData = Object.assign({}, webhookData);
        this.defaultWebhookData = Object.assign({}, webhookData);
      } catch (e) {
        this.error = e.message?.message || e.message || e;
      } finally {
        this.loading = false;
      }
    },
  },
  watch: {
    expanded(expanded) {
      if (expanded) this.loadWebhook();
    },
  },
};
</script>

<style></style>
