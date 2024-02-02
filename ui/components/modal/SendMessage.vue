<template>
  <v-dialog v-model="dialog" max-width="600px">
    <v-card>
      <v-card-title>{{ $t("sendMessage.title") }}</v-card-title>
      <v-card-text>
        <v-form v-model="valid">
          <v-autocomplete
            v-model="numbers"
            multiple
            chips
            :label="$t('sendMessage.to')"
            :loading="loadingContacts"
            :items="contacts"
            v-model:search="search"
          >
            <template v-slot:no-data>
              <v-list-item
                v-if="search"
                @click="addAndSelect"
                :title="search"
              ></v-list-item>
              <v-list-item
                v-else
                :title="$t('sendMessage.noContacts')"
              ></v-list-item>
            </template>
            <template v-slot:chip="{ item }">
              <v-chip class="d-flex gap-1 align-center">
                <v-avatar size="20">
                  <v-img
                    height="20"
                    width="20"
                    v-if="item?.raw?.photo"
                    :src="item?.raw?.photo"
                  />
                  <v-icon size="20" v-else>
                    mdi-{{ item?.raw?.isGroup ? "account-group" : "account" }}
                  </v-icon>
                </v-avatar>

                <span class="ml-2">
                  {{ item.raw.title }}
                </span>
              </v-chip>
            </template>
            <template v-slot:item="{ props, item }">
              <v-list-item v-bind="props" :title="null">
                <div class="d-flex align-center gap-1">
                  <v-avatar size="36">
                    <v-img
                      height="36"
                      width="36"
                      v-if="item?.raw?.photo"
                      :src="item?.raw?.photo"
                    />
                    <v-icon size="36" v-else>
                      mdi-{{ item?.raw?.isGroup ? "account-group" : "account" }}
                    </v-icon>
                  </v-avatar>
                  <div>
                    <p>{{ item?.raw?.title }}</p>
                    <p class="text-disabled font-8">{{ item?.raw?.value }}</p>
                  </div>
                </div>
              </v-list-item>
            </template>
          </v-autocomplete>

          <v-textarea
            v-model="message.textMessage.text"
            :label="$t('sendMessage.message')"
            outlined
            dense
            :rules="[
              (v) => !!v || 'Mensagem é obrigatória',
              (v) =>
                v.length <= 1024 ||
                'Mensagem deve ter no máximo 1024 caracteres',
            ]"
            :counter="1024"
            :disabled="loading"
            rows="3"
            class="mb-3"
          ></v-textarea>

          <div class="d-flex gap-2">
            <v-select
              v-model="message.options.presence"
              :items="[
                'composing',
                'available',
                'active',
                'unavailable',
                'paused',
              ]"
              density="compact"
              :label="$t('sendMessage.presence')"
              :rules="[
                (v) =>
                  !!v || $t('required', { field: $t('sendMessage.presence') }),
              ]"
              :disabled="loading"
              class="mb-3"
            ></v-select>
            <v-text-field
              v-model="message.options.delay"
              type="number"
              :label="$t('sendMessage.delay')"
              density="compact"
              :hint="`${$t('sendMessage.delayHint')}
            (${(message.options.delay / 1000).toFixed(1)} segundos)`"
              :rules="[
                (v) =>
                  !!v || $t('required', { field: $t('sendMessage.delay') }),
              ]"
              :disabled="loading"
              class="mb-3"
            ></v-text-field>
          </div>
        </v-form>

        <v-alert type="success" v-if="success">
          <p>{{ success.message }}</p>
          <b>{{ success.messageId }}</b>
        </v-alert>
        <v-alert type="error" v-if="error">
          {{ Array.isArray(error) ? error.join(", ") : error }}
        </v-alert>
      </v-card-text>
      <v-card-actions>
        <v-btn text @click="dialog = false" :disabled="loading">{{
          $t("close")
        }}</v-btn>
        <v-spacer></v-spacer>
        <v-btn
          color="success"
          variant="tonal"
          @click="send"
          :disabled="!valid"
          :loading="loading"
        >
          {{ $t("sendMessage.send") }}
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script>
import instanceController from "@/services/instanceController";
import { useAppStore } from "@/store/app";
import { mergeDeep } from "@/helpers/deepMerge";

const defaultMessage = (obj = {}) =>
  mergeDeep(
    {
      number: null,
      options: {
        delay: 1200,
        presence: "composing",
      },
      textMessage: {
        text: "",
      },
    },
    obj
  );

export default {
  name: "SettingsModal",
  data: () => ({
    dialog: false,
    valid: false,
    loading: false,
    loadingContacts: false,
    error: false,
    contacts: [],
    numbers: [],
    search: "",
    success: false,
    AppStore: useAppStore(),
    message: defaultMessage(),
  }),
  methods: {
    async send() {
      try {
        this.loading = true;
        this.success = false;
        this.error = false;

        var messagesId = [];
        const messageConfig = this.message;

        messageConfig.options.delay = parseInt(messageConfig.options.delay);

        for (const number of this.numbers) {
          const r = await instanceController.chat.sendMessage(
            this.instance.instance.instanceName,
            {
              ...messageConfig,
              number,
            }
          );

          if (r.key?.id) messagesId.push(r.key?.id);
        }

        this.success = {
          messageId: messagesId.join(", "),
          message: this.$t("sendMessage.success", this.numbers.length),
        };
        this.message = defaultMessage();
        this.numbers = [];
        setTimeout(() => {
          this.success = false;
        }, 10000);
      } catch (e) {
        this.error = e.message?.message || e.message || e;
      } finally {
        this.loading = false;
      }
    },
    open(obj) {
      this.message = defaultMessage(obj);
      this.dialog = true;
      if (!this.contacts.length) {
        this.loadContacts();
      }
    },
    addAndSelect() {
      this.contacts.push({
        title: this.search,
        value: this.search,
        photo: null,
        isGroup: false,
      });
      this.$nextTick(() => {
        this.message.number = this.search;
      });
    },
    async loadContacts() {
      try {
        this.loadingContacts = true;
        this.error = false;
        const contacts = await instanceController.chat.getContacts(
          this.instance.instance.instanceName
        );
        const groups = await instanceController.group.getAll(
          this.instance.instance.instanceName
        );

        const groupsPhotos = {};

        this.contacts = [
          ...contacts
            .filter((c) => {
              const isGroup = c.id.indexOf("g.us") !== -1;
              if (isGroup) groupsPhotos[c.id] = c.profilePictureUrl;
              return !isGroup;
            })
            .map((c) => ({
              title: c.pushName || c.id,
              value: c.id,
              photo: c.profilePictureUrl,
              isGroup: false,
            })),
          ...groups.map((g) => ({
            title: g.subject,
            value: g.id,
            photo: groupsPhotos[g.id],
            isGroup: true,
          })),
        ];
      } catch (e) {
        this.error = e.message?.message || e.message || e;
      } finally {
        this.loadingContacts = false;
      }
    },
  },
  mounted() {
    window.addEventListener("send-message", (e) => {
      this.open(e.detail);
    });
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
