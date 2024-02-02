<template>
  <v-card
    variant="outlined"
    class="d-flex align-center gap-4 pa-2 flex-wrap"
    rounded="xl"
  >
    <v-avatar size="100" rounded="xl">
      <v-icon
        v-if="
          (instance.instance.status != 'open' ||
            instance.instance.profilePictureUrl == null) &&
          statusMapper[instance.instance.status].icon
        "
        size="70"
      >
        {{ statusMapper[instance.instance.status].icon }}
      </v-icon>
      <v-img v-else :src="instance.instance.profilePictureUrl" />
    </v-avatar>
    <div class="d-flex flex-column">
      <span class="text-overline" style="line-height: 1em">
        {{ owner }}
      </span>
      <h2 class="mb-0">
        {{ instance.instance.instanceName }}
        <v-chip
          v-if="instance?.instance?.apikey"
          color="info"
          class="ml-2"
          size="x-small"
          @click="copyApikey"
        >
          <v-icon start size="small">mdi-key</v-icon>
          {{
            (instance.instance?.apikey || "").slice(
              0,
              apikeyReveled ? undefined : 7
            )
          }}{{ apikeyReveled ? "" : "..." }}
          <v-btn
            icon
            @click.stop="toggleReveled"
            density="comfortable"
            class="ml-1"
            variant="text"
            size="x-small"
          >
            <v-icon size="small">
              {{ apikeyReveled ? "mdi-eye-off" : "mdi-eye" }}
            </v-icon>
          </v-btn>
          <v-icon end size="small">
            {{ copied ? "mdi-check" : "mdi-content-copy" }}
          </v-icon>
        </v-chip>
      </h2>
      <small>{{ instance.instance.profileStatus }}</small>
    </div>
    <v-spacer></v-spacer>
    <div class="d-flex gap-2 flex-wrap justify-end">
      <v-btn
        @click="refresh"
        :disabled="
          disconnect.loading || restart.loading || restart.success || reload
        "
        :loading="reload"
        variant="tonal"
        color="primary"
        icon
        size="x-small"
      >
        <v-icon>mdi-refresh</v-icon>
      </v-btn>
      <v-btn
        @click="restartInstance"
        :disabled="disconnect.loading || restart.success || reload"
        :loading="restart.loading"
        variant="tonal"
        color="info"
        size="small"
      >
        <v-icon start>mdi-restart</v-icon>
        {{ restart.success ? `${$t("restarted")}` : `${$t("restart")}` }}
      </v-btn>
      <v-btn
        @click="disconnectInstance"
        :disabled="
          instance.instance.status === 'close' || restart.loading || reload
        "
        :loading="disconnect.loading"
        variant="tonal"
        color="error"
        size="small"
      >
        <v-icon start>mdi-cellphone-nfc-off</v-icon>
        {{ disconnect.confirm ? `${$t("sure")}` : `${$t("disconnect")}` }}
      </v-btn>
    </div>
  </v-card>
</template>

<script>
import { useAppStore } from "@/store/app";
import statusMapper from "@/helpers/mappers/status";
import copyToClipboard from "@/helpers/copyToClipboard";
import instanceController from "@/services/instanceController";

export default {
  name: "InstanceHeader",
  data: () => ({
    disconnect: { confirm: false, loading: false },
    restart: { loading: false, success: false },
    reload: false,
    copied: false,
    apikeyReveled: false,
    statusMapper: statusMapper,
    AppStore: useAppStore(),
  }),
  methods: {
    copyApikey() {
      if (this.copied) return;

      copyToClipboard(this.instance.instance.apikey);

      this.copied = true;
      setTimeout(() => {
        this.copied = false;
      }, 5000);
    },
    async refresh() {
      try {
        this.reload = true;
        await this.AppStore.reconnect();
      } catch (e) {
        console.log(e);
        alert(e.message || e.error || "Erro desconhecido");
      } finally {
        this.reload = false;
      }
    },
    async restartInstance() {
      this.restart.loading = true;
      try {
        await instanceController.restart(this.instance.instance.instanceName);
        this.restart.success = true;

        setTimeout(() => {
          this.restart.success = false;
        }, 5000);

        // await this.AppStore.reconnect();
      } catch (e) {
        console.log(e);
        alert(e.message || e.error || "Erro desconhecido");
      } finally {
        this.restart.loading = false;
      }
    },
    async disconnectInstance() {
      if (!this.disconnect.confirm) return (this.disconnect.confirm = true);

      this.disconnect.loading = true;
      try {
        this.disconnect.confirm = false;
        await instanceController.logout(this.instance.instance.instanceName);
        await this.AppStore.reconnect();
      } catch (e) {
        console.log(e);
        alert(e.message || e.error || "Erro desconhecido");
      } finally {
        this.disconnect.loading = false;
      }
    },
    toggleReveled() {
      this.apikeyReveled = !this.apikeyReveled;
    },
  },
  computed: {
    owner() {
      if (!this.instance?.instance?.owner)
        return (
          this.$t(`status.${this.instance.instance.status}`) ||
          this.$t("unknown")
        );

      return (this.instance?.instance?.owner || "").split("@")[0];
    },
  },
  props: {
    instance: {
      type: Object,
      required: true,
    },
  },
};
</script>

<style></style>
