<template>
  <v-dialog v-model="dialog" max-width="750px" scrollable>
    <v-card :loading="loading">
      <v-card-title class="justify-space-between d-flex align-center">
        {{ group?.subject }}
        <v-btn icon @click="dialog = false" variant="text">
          <v-icon>mdi-close</v-icon>
        </v-btn>
      </v-card-title>
      <v-card-text v-if="group">
        <p class="mb-2">{{ group.desc }}</p>

        <div v-if="group.participants">
          <v-card class="my-2" variant="outlined">
            <div
              class="pa-3 gap-x-4 gap-y-1 d-flex flex-wrap align-center justify-center justify-space-around"
            >
              <span>
                <v-icon start size="x-small">mdi-calendar</v-icon>
                <b>Criado em:</b>
                {{ formatTimestamp(group.creation * 1000) }}
              </span>
              <span>
                <v-icon start size="x-small">mdi-crown</v-icon>
                <b>Dono:</b>
                {{ (group.owner || "Desconhecido").split("@")[0] }}
              </span>
              <span>
                <v-icon start size="x-small">mdi-account</v-icon>
                <b>
                  {{ isAdmin ? "É Admin" : "Não é Admin" }}
                </b>
              </span>
            </div>
          </v-card>

          <div class="d-flex flex-wrap justify-space-between mt-4">
            <h4>
              Participantes
              <v-chip color="info" size="small">
                {{ group.participants.length }}
              </v-chip>
            </h4>

            <div
              v-if="isAdmin"
              class="flex-grow-1 d-flex justify-end align-center gap-x-1"
            >
              <v-tooltip text="Remover participantes" location="top">
                <template v-slot:activator="{ props }">
                  <v-btn
                    v-bind="props"
                    @click="removeParticipants"
                    :loading="deletingInstance"
                    :disabled="selected.length === 0 || btnLoading"
                    color="error"
                    text
                    size="small"
                  >
                    <v-icon size="large"> mdi-account-multiple-remove </v-icon>
                  </v-btn>
                </template>
              </v-tooltip>
              <v-tooltip text="Adicionar participantes" location="top">
                <template v-slot:activator="{ props }">
                  <v-btn
                    v-bind="props"
                    @click="addParticipant"
                    :disabled="btnLoading"
                    color="primary"
                    text
                    size="small"
                  >
                    <v-icon size="large"> mdi-account-multiple-plus </v-icon>
                  </v-btn>
                </template>
              </v-tooltip>
            </div>
          </div>

          <v-text-field
            v-model="search"
            prepend-inner-icon="mdi-magnify"
            label="Pesquisar"
            variant="outlined"
            single-line
            hide-details
            class="mt-1"
            density="compact"
          />
          <v-data-table
            density="compact"
            :items="group.participants"
            :headers="[
              { title: 'Participante', value: 'id' },
              { title: 'Admin', value: 'admin', sortable: true },
            ]"
            :search="search"
            item-value="id"
            :show-select="isAdmin"
            v-model="selected"
          >
            <!-- eslint-disable-next-line vue/valid-v-slot -->
            <template v-slot:item.id="{ item }">
              {{ item.id.split("@")[0] }}
              <v-chip
                v-if="item.id === instance.instance.owner"
                color="primary"
                size="x-small"
                label
              >
                Instância
              </v-chip>
            </template>
            <!-- eslint-disable-next-line vue/valid-v-slot -->
            <template v-slot:item.admin="{ item }">
              <v-chip v-if="item.admin" color="success" size="small">
                {{ item.admin }}
              </v-chip>
            </template>
          </v-data-table>
        </div>
        <!-- <p class="mt-10">{{ instance }}</p> -->

        <v-alert type="error" v-if="error">
          {{ Array.isArray(error) ? error.join(", ") : error }}
        </v-alert>
      </v-card-text>
      <v-card-actions>
        <v-spacer />
        <v-btn text @click="dialog = false" :disabled="loading"> Fechar </v-btn>
        <v-spacer />
      </v-card-actions>
    </v-card>
  </v-dialog>
  <GroupAddParticipantModal
    ref="addParticipant"
    :instance="instance"
    :group="group"
    @success="loadFullInfo(group.id)"
  />
</template>

<script>
import instanceController from "@/services/instanceController";
import GroupAddParticipantModal from "./GroupAddParticipantModal.vue";
export default {
  components: {
    GroupAddParticipantModal,
  },
  name: "SettingsModal",
  data: () => ({
    dialog: false,
    loading: false,
    error: false,
    group: null,
    search: "",
    selected: [],

    deletingInstance: false,
  }),
  methods: {
    formatTimestamp(timestamp) {
      if (!timestamp) return "";
      return new Date(timestamp).toLocaleString();
    },
    addParticipant() {
      this.$refs.addParticipant.open();
    },
    async removeParticipants() {
      try {
        this.deletingInstance = true;
        this.error = false;

        const isExit = this.selected.includes(this.instance.instance.owner);

        if (isExit) {
          const confirm = await window.confirm(
            "Você está prestes a sair do grupo, deseja continuar?"
          );
          if (!confirm) return;
        }

        await instanceController.group.updateParticipant(
          this.instance.instance.instanceName,
          this.group.id,
          "remove",
          this.selected
        );

        this.group.participants = this.group.participants.filter(
          (p) => !this.selected.includes(p.id)
        );
        this.selected = [];
      } catch (e) {
        this.error = e.message?.message || e.message || e;
      } finally {
        this.deletingInstance = false;
      }
    },
    async loadFullInfo(groupId) {
      try {
        this.loading = true;
        this.error = false;
        const data = await instanceController.group.getById(
          this.instance.instance.instanceName,
          groupId
        );
        console.log(data);
        this.group = data;
      } catch (e) {
        this.error = e.message?.message || e.message || e;
      } finally {
        this.loading = false;
      }
    },
    open(group) {
      this.group = Object.assign({}, group);
      this.loadFullInfo(group.id);
      this.dialog = true;
    },
  },
  watch: {
    dialog(val) {
      if (!val) {
        this.group = null;
        this.error = false;
        this.search = "";
        this.selected = [];
      }
    },
  },
  computed: {
    btnLoading() {
      return this.deletingInstance;
    },
    isAdmin() {
      if (!this.group.participants) return false;
      return this.group.participants.find(
        (p) => p.id === this.instance.instance.owner
      )?.admin;
    },
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
