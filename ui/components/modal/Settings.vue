<template>
  <v-dialog
    v-model="dialog"
    max-width="500px"
    :persistent="!AppStore.validConnection"
  >
    <v-card>
      <v-card-text>
        <v-form v-model="valid">
          <h3 class="mb-4">{{ $t("connection.title") }}</h3>
          <v-text-field
            v-model="connection.host"
            label="URL"
            required
            outlined
            :rules="hostRules"
          />
          <v-text-field
            v-model="connection.globalApiKey"
            label="Global API Key"
            required
            outlined
            :type="revelPassword ? 'text' : 'password'"
            :append-inner-icon="revelPassword ? 'mdi-eye' : 'mdi-eye-off'"
            @click:append-inner="revelPassword = !revelPassword"
          />
        </v-form>

        <v-alert type="error" v-if="error">
          {{ Array.isArray(error) ? error.join(", ") : error }}
        </v-alert>
      </v-card-text>
      <v-card-actions>
        <div class="d-flex flex-wrap justify-space-between w-100 align-center">
          <v-btn size="small" text @click="showAbout">
            {{ $t("about.title") }}
          </v-btn>
          <div class="d-flex justify-end flex-grow-1 gap-1">
            <v-btn
              v-if="!!AppStore.connection.host"
              icon
              class="ml-0"
              size="small"
              @click="logout"
              :disabled="loading"
            >
              <v-icon>mdi-logout</v-icon>
            </v-btn>
            <!-- <v-btn
              v-if="AppStore.validConnection"
              class="ml-0"
              text
              @click="dialog = false"
              :disabled="loading"
            >
              Cancel
            </v-btn> -->
            <v-btn
              v-if="AppStore.validConnection"
              class="ml-0"
              text
              @click="share"
              :disabled="loading"
              icon
              size="small"
            >
              <v-icon>mdi-share-variant</v-icon>
            </v-btn>
            <v-btn
              color="success"
              class="ml-0"
              variant="tonal"
              @click="save()"
              :disabled="!valid"
              :loading="loading"
            >
              {{ $t("connection.action") }}
            </v-btn>
          </div>
        </div>
      </v-card-actions>
    </v-card>

    <v-card class="mt-2" v-if="connectionsList && connectionsList.length > 1">
      <v-card-text>
        <h3 class="mb-4">
          {{ $t("connection.saved", connectionsList.length) }}
        </h3>
        <v-list>
          <v-list-item
            v-for="conect in connectionsList"
            :key="conect.host"
            :disabled="
              loading ||
              (conect.host === AppStore.connection.host &&
                AppStore.validConnection)
            "
            @click="save(conect)"
          >
            <v-list-item-content>
              <v-list-item-title>
                {{ conect.host.replace(/https?:\/\//, "") }}
              </v-list-item-title>

              <!-- <v-list-item-subtitle>
                {{ connection.globalApiKey.slice(0, 10) }}...
              </v-list-item-subtitle> -->
            </v-list-item-content>
            <template v-slot:append>
              <v-btn
                @click.stop="removeConnection(conect)"
                icon
                v-if="
                  conect.host !== AppStore.connection.host ||
                  !AppStore.validConnection
                "
                size="x-small"
                variant="tonal"
                color="error"
                :disabled="loading"
              >
                <v-icon>mdi-delete</v-icon>
              </v-btn>
              <v-btn
                icon
                v-else
                size="x-small"
                variant="tonal"
                color="success"
                :disabled="loading"
              >
                <v-icon>mdi-check</v-icon>
              </v-btn>
            </template>
          </v-list-item>
        </v-list>
      </v-card-text>
    </v-card>
  </v-dialog>
  <about-modal ref="about" />
  <share-connection ref="share" />
</template>

<script>
import { useAppStore } from "@/store/app";
import AboutModal from "./About.vue";
import ShareConnection from "./ShareConnection.vue";
const BASE_URL = import.meta.env.BASE_URL;

export default {
  components: { AboutModal, ShareConnection },
  name: "SettingsModal",
  data: () => ({
    dialog: false,
    valid: false,
    revelPassword: false,
    connection: {
      host: BASE_URL ? window.location.origin : "",
      globalApiKey: "",
    },
    loading: false,
    error: false,
    AppStore: useAppStore(),
    isHttps: window.location.protocol === "https:",
  }),
  methods: {
    share() {
      const connection = Object.assign({}, this.AppStore.connection);
      this.$refs.share.open(connection);
    },
    logout() {
      this.AppStore.logout();
      this.connection = {
        host: "",
        globalApiKey: "",
      };
    },
    showAbout() {
      this.$refs.about.open();
    },
    removeConnection(connection) {
      this.AppStore.removeConnection(connection);
    },
    async save(connection) {
      try {
        this.loading = true;
        this.error = false;

        await this.AppStore.setConnection(connection || this.connection);
        this.dialog = false;
      } catch (e) {
        this.error = e.message?.message || e.message || e;
      } finally {
        this.loading = false;
      }
    },
    open() {
      this.dialog = true;
      this.connection = Object.assign({}, this.AppStore.connection);
      if (!this.connection.host && BASE_URL.startsWith("/manager"))
        this.connection.host = window.location.origin;
    },
  },
  watch: {
    "AppStore.validConnection"(val, oldVal) {
      if (val === oldVal) return;
      if (!val) this.dialog = true;
    },
  },
  computed: {
    connectionsList() {
      return this.AppStore.connectionsList;
    },
    hostRules() {
      return [
        (v) =>
          new RegExp(`^(${!this.isHttps ? "http|" : ""}https)://`, "i").test(
            v
          ) || this.$t(this.isHttps ? "https" : "httpHttps", { field: "URL" }),
      ];
    },
  },

  emits: ["close"],
};
</script>
