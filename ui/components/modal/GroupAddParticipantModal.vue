<template>
  <v-dialog v-model="dialog" max-width="600px" :persistent="loading">
    <v-card :loading="loading">
      <v-card-title class="justify-space-between d-flex align-center">
        Adicionar Participantes •
        {{ group?.subject }}
      </v-card-title>
      <v-card-text>
        <h5 class="mb-2">Adicione participantes ao grupo</h5>

        <v-textarea
          v-model="participants"
          label="Participantes (um por linha)"
          outlined
          density="comfortable"
          rows="5"
          :placeholder="`Um por linha`"
          :hint="`${prependDDI ? '' : 'DDI + '}DDD + Número\n • ${
            validParticipants.length
          } encontrados.`"
        />

        <div class="d-flex">
          <v-switch
            class="flex-shrink-0"
            v-model="prependDDI"
            label="Adicionar DDI"
            color="primary"
            density="comfortable"
            hint="Adiciona o DDI automaticamente no início do número"
          ></v-switch>
          <v-text-field
            v-if="prependDDI"
            class="flex-grow-1"
            type="number"
            v-model="ddi"
            label="DDI"
            outlined
            density="comfortable"
          ></v-text-field>
        </div>

        <v-alert type="error" v-if="error">
          {{ Array.isArray(error) ? error.join(", ") : error }}
        </v-alert>
      </v-card-text>
      <v-card-actions>
        <v-btn text @click="dialog = false" :disabled="loading"> Fechar </v-btn>
        <v-spacer />
        <v-btn
          color="success"
          @click="addToGroup"
          :loading="loading"
          :disabled="!validParticipants.length"
          variant="tonal"
        >
          Adicionar
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script>
import instanceController from "@/services/instanceController";
export default {
  name: "SettingsModal",
  data: () => ({
    dialog: false,
    loading: false,
    error: false,
    participants: "",
    ddi: "55",
    prependDDI: true,
  }),
  methods: {
    async addToGroup() {
      try {
        this.loading = true;
        this.error = false;

        const participants = this.validParticipants.map((p) => {
          if (this.prependDDI) p = `${this.ddi}${p}`;
          return p.replace(/\D/g, "");
        });

        await instanceController.group.updateParticipant(
          this.instance.instance.instanceName,
          this.group.id,
          "add",
          participants
        );

        this.participants = "";
        this.dialog = false;
        this.$emit("success");
      } catch (e) {
        this.error = e.message?.message || e.message || e;
      } finally {
        this.loading = false;
      }
    },
    open() {
      this.dialog = true;
    },
  },
  watch: {
    dialog(val) {
      if (!val) {
        this.participants = "";
        this.error = false;
        this.prependDDI = true;
        this.ddi = "55";
      }
    },
  },
  computed: {
    validParticipants() {
      return [
        ...new Set(
          this.participants
            .trim()
            .split("\n")
            .filter((p) => p.trim().length > 5)
        ),
      ];
    },
  },
  props: {
    instance: {
      type: Object,
      required: true,
    },
    group: {
      type: Object,
      required: true,
    },
  },
  emits: ["close"],
};
</script>
