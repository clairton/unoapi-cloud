<template>
  <v-card variant="outlined" :loading="loading">
    <v-card-title
      class="d-flex align-center"
      @click="toggleExpanded"
      style="cursor: pointer"
      v-ripple
    >
      <v-icon start>mdi-account-box</v-icon>
      {{ $t("profilePicture.title") }}

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

      <div class="d-flex flex-wrap justify-center gap-x-4">
        <v-avatar size="150">
          <v-img
            v-if="instance.instance.profilePictureUrl"
            :src="instance.instance.profilePictureUrl"
            :alt="instance.instance.profileName"
          />
          <div v-else class="d-flex flex-column align-center">
            <v-icon size="70"> mdi-account-question </v-icon>
            {{ $t("profilePicture.noPhoto")  }}
          </div>
        </v-avatar>

        <v-card
          variant="outlined"
          class="h-full d-flex flex-column justify-center align-center rounded-pill"
          width="150"
          @click="selectPhoto"
        >
          <v-progress-circular
            indeterminate
            v-if="loading == 'uploading'"
            size="50"
          />
          <v-icon size="50" v-else>mdi-upload</v-icon>
          {{ $t("profilePicture.upload") }}
        </v-card>
        <v-card
          v-if="instance.instance.profilePictureUrl"
          variant="outlined"
          class="h-full d-flex flex-column justify-center align-center rounded-pill"
          width="150"
          @click="removePicture"
          :disabled="loading"
        >
          <v-progress-circular
            indeterminate
            v-if="loading == 'removing'"
            size="50"
          />
          <v-icon size="50" v-else>mdi-delete</v-icon>
          {{ $t("profilePicture.remove") }}
        </v-card>
      </div>
      <input
        type="file"
        accept="image/*"
        ref="fileInput"
        style="display: none"
        @change="upload"
      />
    </v-card-text>
  </v-card>
</template>

<script>
import instanceController from "@/services/instanceController";
import { useAppStore } from "@/store/app";
export default {
  name: "ProfilePhoto",
  props: {
    instance: {
      type: Object,
      required: true,
    },
  },
  data: () => ({
    AppStore: useAppStore(),

    expanded: false,
    loading: false,
    error: false,
    valid: false,
    data: {
      name: "",
      status: "",
    },
    defaultData: {
      name: "",
      status: "",
    },
  }),

  methods: {
    toggleExpanded() {
      if (this.loading) return;
      this.expanded = !this.expanded;
    },
    async removePicture() {
      try {
        this.loading = "removing";
        this.error = false;

        if (!this.isOpen) return;

        await instanceController.profile.removePicture(
          this.instance.instance.instanceName
        );

        this.AppStore.setPhoto(this.instance.instance.instanceName, null);
      } catch (e) {
        this.error = e.message?.message || e.message || e;
      } finally {
        this.loading = false;
      }
    },
    async upload(event) {
      try {
        this.loading = "uploading";
        this.error = false;
        if (!this.isOpen) return;

        const file = event.target.files[0];

        const base64 = await this.fileToBase64(file);

        await instanceController.profile.updatePicture(
          this.instance.instance.instanceName,
          base64.split(",")[1]
        );
        this.AppStore.setPhoto(this.instance.instance.instanceName, base64);
      } catch (e) {
        this.error = e.message?.message || e.message || e;
      } finally {
        this.loading = false;
        event.target.value = "";
      }
    },
    fileToBase64(file) {
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve(reader.result);
        reader.onerror = reject;
      });
    },
    selectPhoto() {
      if (this.loading) return;
      this.$refs.fileInput.click();
    },
  },

  computed: {
    isOpen() {
      return this.instance.instance.status === "open";
    },
  },
};
</script>

<style></style>
