<template>
  <v-card variant="outlined" :loading="loading">
    <v-card-title
      class="d-flex align-center"
      @click="toggleExpanded"
      style="cursor: pointer"
      v-ripple
    >
      <v-icon start>mdi-chat</v-icon>
      Chatwoot
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
          v-model="chatwootData.url"
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

        <div class="d-flex gap-4 flex-wrap">
          <div class="flex-grow-1">
            <v-text-field
              v-model="chatwootData.account_id"
              :label="$t('chatwoot.account_id')"
              :disabled="loading"
              outlined
              dense
              hide-details="auto"
              class="mb-3"
              :rules="[
                (account_id) => {
                  if (!account_id)
                    return this.$t('required', {
                      field: this.$t('chatwoot.account_id'),
                    });
                  return true;
                },
              ]"
            />
          </div>
          <div class="flex-grow-1">
            <v-text-field
              v-model="chatwootData.token"
              :label="$t('chatwoot.token')"
              :disabled="loading"
              outlined
              dense
              hide-details="auto"
              class="mb-3"
              :rules="[
                (token) => {
                  if (!token)
                    return this.$t('required', {
                      field: this.$t('chatwoot.token'),
                    });
                  return true;
                },
              ]"
            />
          </div>
        </div>
        <div class="d-flex align-center gap-4 flex-wrap">
          <v-checkbox
            class="flex-grow-0 flex-shrink-0"
            v-model="chatwootData.sign_msg"
            :disabled="loading"
            hide-details
            density="compact"
          >
            <template v-slot:label>
              <span>{{ $t("chatwoot.signMsg") }}</span>
              <HelpTooltip> {{ $t("chatwoot.signMsgHelp") }} </HelpTooltip>
            </template>
          </v-checkbox>
          <v-text-field
            class="flex-grow-1 flex-shrink-0"
            v-model="chatwootData.sign_delimiter"
            :disabled="loading || !chatwootData.sign_msg || !AppStore.versionSatisfies('>=1.6.1')"
            :label="$t('chatwoot.signDelimiter')"
            :hint="
              !AppStore.versionSatisfies('>=1.6.0')
                ? $t('version.availableFrom', { version: '1.6.1' })
                : $t('chatwoot.signDelimiterHelp')
            "
            :persistent-hint="!AppStore.versionSatisfies('>=1.6.1')"
            hide-details="auto"
            placeholder="\n"
            style="min-width: 200px"
          ></v-text-field>
        </div>

        <div class="d-flex gap-x-4 flex-wrap">
          <div>
            <v-checkbox
              v-model="chatwootData.reopen_conversation"
              :disabled="loading"
              hide-details
              class="mb-3"
              density="compact"
            >
              <template v-slot:label>
                <span>{{ $t("chatwoot.reopenConversation") }}</span>
                <HelpTooltip>
                  {{ $t("chatwoot.reopenConversationHelp") }}
                </HelpTooltip>
              </template>
            </v-checkbox>
          </div>

          <div>
            <v-checkbox
              v-model="chatwootData.conversation_pending"
              :disabled="loading"
              hide-details
              class="mb-3"
              density="compact"
            >
              <template v-slot:label>
                <span>{{ $t("chatwoot.conversationPending") }}</span>
                <HelpTooltip>
                  {{ $t("chatwoot.conversationPendingHelp") }}
                </HelpTooltip>
              </template>
            </v-checkbox>
          </div>

          <div>
            <v-checkbox
              v-model="chatwootData.auto_create"
              :disabled="loading || !AppStore.versionSatisfies('>=1.6.0')"
              :hint="
                !AppStore.versionSatisfies('>=1.6.0')
                  ? $t('version.availableFrom', { version: '1.6.0' })
                  : undefined
              "
              :persistent-hint="!AppStore.versionSatisfies('>=1.6.0')"
              hide-details="auto"
              class="mb-3"
              density="compact"
            >
              <template v-slot:label>
                <span>{{ $t("chatwoot.autoCreate") }}</span>
                <HelpTooltip>{{ $t("chatwoot.autoCreateHelp") }}</HelpTooltip>
              </template>
            </v-checkbox>
          </div>
        </div>
      </v-form>
    </v-card-text>
    <v-card-actions v-if="expanded" class="d-flex flex-wrap gap-x-1">
      <v-switch
        v-model="chatwootData.enabled"
        label="Habilitado"
        color="primary"
        :disabled="loading"
        hide-details
      ></v-switch>
      <v-btn variant="text" @click="chatwootConfig" size="small">
       {{ $t("chatwoot.config.btn") }}
      </v-btn>
      <v-spacer></v-spacer>
      <v-btn
        :disabled="
          !valid ||
          JSON.stringify(chatwootData) === JSON.stringify(defaultChatwootData)
        "
        :loading="loading"
        color="primary"
        @click="saveChatwoot"
        variant="tonal"
      >
        Salvar
      </v-btn>
    </v-card-actions>
  </v-card>
  <chatwoot-config :instance="instance" ref="chatwootConfig" />
</template>

<script>
import ChatwootConfig from "@/components/modal/ChatwootConfig.vue";
import instanceController from "@/services/instanceController";
import { useAppStore } from "@/store/app";
const defaultObj = () => ({
  enabled: false,
  url: "",
  account_id: "",
  token: "",
  sign_msg: true,
  sign_delimiter: "\n",
  reopen_conversation: true,
  conversation_pending: false,
  auto_create: undefined,
});

export default {
  name: "InstanceChatwoot",
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
    AppStore: useAppStore(),
    chatwootData: {
      enabled: false,
      url: "",
      account_id: "",
      token: "",
      sign_msg: true,
      sign_delimiter: "\n",
      reopen_conversation: true,
      conversation_pending: false,
    },
    defaultChatwootData: {
      enabled: false,
      url: "",
      account_id: "",
      token: "",
      sign_msg: true,
      sign_delimiter: "\n",
      reopen_conversation: true,
      conversation_pending: false,
    },
  }),
  methods: {
    toggleExpanded() {
      if (this.loading) return;
      this.expanded = !this.expanded;
    },
    chatwootConfig() {
      this.$refs.chatwootConfig.open();
    },
    async saveChatwoot() {
      try {
        this.loading = true;
        this.error = false;
        await instanceController.chatwoot.set(
          this.instance.instance.instanceName,
          {
            ...this.chatwootData,
            url: this.chatwootData.url.trim().replace(/\/$/, ""),
          }
        );
        this.defaultChatwootData = Object.assign({}, this.chatwootData);
      } catch (e) {
        this.error = e.message?.message || e.message || e;
      } finally {
        this.loading = false;
      }
    },
    async loadChatwoot() {
      try {
        this.loading = true;
        this.error = false;
        const chatwootData = await instanceController.chatwoot.get(
          this.instance.instance.instanceName
        );

        const validData = chatwootData._doc || chatwootData;

        this.chatwootData = Object.assign(defaultObj(), validData || {});
        this.defaultChatwootData = Object.assign(defaultObj(), validData || {});
      } catch (e) {
        this.error = e.message?.message || e.message || e;
      } finally {
        this.loading = false;
      }
    },
  },
  watch: {
    expanded(expanded) {
      if (expanded) this.loadChatwoot();
    },
  },
  components: { ChatwootConfig },
};
</script>

<style></style>
