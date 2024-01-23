<template>
  <div>
    <div class="d-flex mb-4 align-center">
      <h3>{{ $t("instance", 2) }}</h3>
      <v-spacer></v-spacer>
      <v-btn
        :disabled="loading"
        @click="getInstances"
        icon
        variant="text"
        size="small"
        class="mr-2"
      >
        <v-icon>mdi-refresh</v-icon>
      </v-btn>
      <v-btn
        color="primary"
        variant="tonal"
        @click="addInstance"
        :disabled="loading"
      >
        <v-icon>mdi-plus</v-icon>
        <span class="ml-2">
          {{ $t("instance") }}
        </span>
      </v-btn>
    </div>

    <v-row dense>
      <v-col cols="12" v-if="loading">
        <v-progress-linear v-if="loading" indeterminate color="info" />
        <v-alert type="info" class="mb-4" v-else :loading="loading" outlined>
          {{ $t("loading") }}...
        </v-alert>
      </v-col>
      <v-col v-else cols="12">
        <div class="d-flex gap-2 flex-wrap mb-2">
          <v-text-field
            v-model="search"
            :label="$t('search')"
            density="comfortable"
            variant="outlined"
            hide-details
          />
          <v-btn-toggle
            v-model="statusFilter"
            variant="outlined"
            divided
            mandatory
          >
            <v-btn
              :value="false"
              :disabled="loading"
              :loading="loading"
              variant="outlined"
              size="x-small"
            >
              {{$t("all")}}
            </v-btn>
            <v-btn
              v-for="[key, item] in Object.entries(statusMapper)"
              :key="item.text"
              :value="key"
              :color="item.color"
              :disabled="loading"
              :loading="loading"
              variant="outlined"
              size="x-small"
            >
            {{ $t(`status.${key}`) }}
            </v-btn>
          </v-btn-toggle>
        </div>
      </v-col>
      <template v-if="filteredInstances.length !== 0">
        <v-col
          cols="12"
          sm="6"
          lg="4"
          v-for="{ instance } in filteredInstances"
          :key="instance.instanceName"
        >
          <v-card
            @click="goToInstance(instance)"
            class="pa-2 rounded-lg"
            variant="outlined"
            :disabled="loading"
          >
            <div class="d-flex align-center gap-2">
              <v-avatar size="50">
                <v-img
                  v-if="instance.profilePictureUrl"
                  :src="instance.profilePictureUrl"
                />
                <v-icon v-else>{{ statusMapper[instance.status].icon }}</v-icon>
              </v-avatar>
              <div class="flex-shrink-1">
                <v-chip
                  :color="statusMapper[instance.status].color"
                  size="x-small"
                  label
                >
                  <v-icon
                    v-if="statusMapper[instance.status].icon"
                    start
                    size="x-small"
                  >
                    {{ statusMapper[instance.status].icon }}
                  </v-icon>
                  {{ $t(`status.${instance.status}`) }}
                </v-chip>
                <h5>{{ instance.instanceName }}</h5>
              </div>
              <div class="ml-auto flex-shrink-0">
                <v-btn
                  :disabled="loading || !!loadingDelete"
                  :loading="loadingDelete === instance.instanceName"
                  @click.stop="deleteInstance(instance.instanceName)"
                  icon
                  variant="tonal"
                  color="error"
                  size="x-small"
                >
                  <v-icon>mdi-delete</v-icon>
                </v-btn>
              </div>
            </div>
          </v-card>
        </v-col>
      </template>
      <v-col v-else cols="12">
        <v-alert type="info" class="mb-4" outlined>
          {{ $t("noInstances") }}
        </v-alert>
      </v-col>
    </v-row>
    <v-alert v-if="error" type="error">
      {{ error }}
    </v-alert>
  </div>
  <CreateInstance ref="createInstanceModal" />
</template>

<script>
import { useAppStore } from "@/store/app";
import CreateInstance from "@/components/modal/CreateInstance";
import statusMapper from "@/helpers/mappers/status";
import instanceController from "@/services/instanceController";

export default {
  name: "HomeInstance",
  components: {
    CreateInstance,
  },
  data: () => ({
    AppStore: useAppStore(),
    loadingInner: false,
    loadingDelete: false,
    error: false,
    statusMapper: statusMapper,
    statusFilter: false,
    search: "",
  }),
  methods: {
    addInstance() {
      this.$refs.createInstanceModal.open();
    },
    goToInstance(instance) {
      this.$router.push({
        name: "instance",
        params: { id: instance.instanceName },
      });
    },
    async deleteInstance(instanceName) {
      try {
        this.loadingDelete = instanceName;
        const confirm = window.confirm(
          `Tem certeza que deseja excluir a instância ${instanceName}?`
        );
        if (!confirm) return;

        await instanceController.logout(instanceName).catch(() => {});
        await instanceController.delete(instanceName);
        await this.AppStore.reconnect();
      } catch (e) {
        this.error = e.message?.message || e.message || e;
      } finally {
        this.loadingDelete = false;
      }
    },
    async getInstances() {
      try {
        this.loadingInner = true;
        this.instances = await this.AppStore.reconnect();
      } catch (e) {
        this.error = e.message?.message || e.message || e;
      } finally {
        this.loadingInner = false;
      }
    },
  },
  watch: {},
  computed: {
    loading() {
      return this.loadingInner || this.AppStore.connecting;
    },
    instances() {
      return this.AppStore.instances;
    },
    filteredInstances() {
      const instances = this.instances.filter((instance) => {
        if (!this.statusFilter) return true;
        return instance.instance.status === this.statusFilter;
      });

      if (!this.search) return instances;
      return instances.filter((instance) => {
        const search = this.search.trim().toLowerCase();

        return (
          (instance.instance.instanceName || "")
            .toLowerCase()
            .includes(search) ||
          (instance.instance.owner || "").toLowerCase().includes(search)
        );
      });
    },
  },
  mounted() {},
};
</script>
