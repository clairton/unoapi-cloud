<!-- eslint-disable vue/valid-v-slot -->
<template>
  <v-dialog v-model="dialog" max-width="850px" scrollable>
    <v-card>
      <v-card-title class="d-flex align-center">
        {{ $t("typebot.session.title") }}
        <v-spacer />
        <h3>{{ sessions.length }}</h3>
        <v-btn
          @click="$emit('refresh')"
          icon
          :loading="loading"
          size="small"
          variant="text"
        >
          <v-icon>mdi-refresh</v-icon>
        </v-btn>
      </v-card-title>
      <v-card-text>
        <v-data-table
          :headers="headers"
          :items="sessions"
          :no-data-text="
            loading ? `${$t('loading')}...` : $t('typebot.session.noData')
          "
          :rows-per-page-items="[10, 25, 50, 100]"
        >
          <template v-slot:item.remoteJid="{ item }">
            <a :href="`https://wa.me/${item.remoteJid.split('@')[0]}`">
              {{ item.remoteJid.split("@")[0] }}
            </a>
          </template>
          <template v-slot:item.status="{ item }">
            <v-chip :color="item.status.color" label size="small">
              <v-icon start>{{ item.status.icon }}</v-icon>
              {{ $t(`typebot.status.${item.status.id}`) }}
            </v-chip>
          </template>
          <template v-slot:item.variables="{ item }">
            <v-tooltip top>
              <template v-slot:activator="{ props }">
                <v-chip color="primary" label size="small" v-bind="props">
                  {{ Object.entries(item.prefilledVariables).length }}
                </v-chip>
              </template>
              <div>
                <p
                  v-for="[key, value] of Object.entries(
                    item.prefilledVariables
                  )"
                  :key="key"
                >
                  <b>{{ key }}:</b> {{ value }}
                </p>
              </div>
            </v-tooltip>
          </template>
          <template v-slot:item.createdAt="{ item }">
            {{ formatDate(item.createdAt) }}
          </template>
          <template v-slot:item.updateAt="{ item }">
            {{ formatDate(item.updateAt) }}
          </template>
          <template v-slot:item.actions="{ item }">
            <div class="d-flex flex-wrap align-center justify-end">
              <v-btn
                v-if="item.status.id === 'paused'"
                variant="text"
                color="success"
                icon
                size="small"
                :loading="
                  loadingInner?.remoteJid === item.remoteJid &&
                  loadingInner?.status === 'opened'
                "
                :disabled="!!loadingInner"
                @click="changeStatus(item, 'opened')"
              >
                <v-icon>mdi-play</v-icon>
              </v-btn>
              <v-btn
                v-if="item.status.id === 'opened'"
                variant="text"
                color="info"
                icon
                size="small"
                :loading="
                  loadingInner?.remoteJid === item.remoteJid &&
                  loadingInner?.status === 'paused'
                "
                :disabled="!!loadingInner"
                @click="changeStatus(item, 'paused')"
              >
                <v-icon>mdi-pause</v-icon>
              </v-btn>
              <v-btn
                variant="text"
                color="error"
                icon
                size="small"
                :loading="
                  loadingInner?.remoteJid === item.remoteJid &&
                  loadingInner?.status === 'closed'
                "
                :disabled="!!loadingInner"
                @click="changeStatus(item, 'closed')"
              >
                <v-icon>mdi-delete</v-icon>
              </v-btn>
            </div>
          </template>
        </v-data-table>
      </v-card-text>
      <v-card-actions>
        <v-spacer></v-spacer>
        <v-btn text @click="dialog = false" :disabled="loading || loadingInner">
          {{ $t("close") }}
        </v-btn>
        <v-spacer></v-spacer>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script>
import typebotStatus from "@/helpers/mappers/typebotStatus";
import instanceController from "@/services/instanceController";
export default {
  name: "SettingsModal",
  data() {
    return {
      dialog: false,
      typebotStatus,
      headers: [
        { title: "Whatsapp", value: "remoteJid" },
        { title: "Status", value: "status" },
        {
          title: this.$t("typebot.session.headers.variables"),
          value: "variables",
        },
        {
          title: this.$t("typebot.session.headers.createdAt"),
          value: "createdAt",
        },
        {
          title: this.$t("typebot.session.headers.updatedAt"),
          value: "updateAt",
        },
        { title: "", value: "actions" },
      ],
      loadingInner: false,
    };
  },
  methods: {
    open() {
      this.dialog = true;
    },
    formatDate(date) {
      return new Date(date).toLocaleString();
    },
    async changeStatus(session, status) {
      try {
        const { remoteJid } = session;

        const data = {
          remoteJid,
          status,
        };
        this.loadingInner = data;

        await instanceController.typebot.changeStatus(
          this.instance.instance.instanceName,
          data
        );

        this.$emit("refresh");
      } catch (error) {
        console.log(error);
      } finally {
        this.loadingInner = false;
      }
    },
  },
  computed: {
    sessions() {
      return this.data.sessions.map((session) => ({
        ...session,
        status: { ...typebotStatus[session.status], id: session.status },
      }));
    },
  },
  props: {
    instance: {
      type: Object,
      required: true,
    },
    data: {
      type: Object,
      required: true,
    },
    loading: {
      type: Boolean,
      required: true,
    },
  },
};
</script>
