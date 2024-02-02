<template>
  <v-card variant="outlined" :loading="loading">
    <v-card-title
      class="d-flex align-center"
      @click="toggleExpanded"
      style="cursor: pointer"
      v-ripple
    >
      <v-icon start>mdi-shield-account</v-icon>
      {{ $t("privacy.title") }}
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
        <v-select
          v-model="privacyData.last"
          :items="WAPrivacyValue"
          :label="$t('privacy.lastSeen')"
          :rules="[
            (v) => !!v || $t('required', { field: $t('privacy.lastSeen') }),
          ]"
          density="comfortable"
          prepend-inner-icon="mdi-clock-outline"
        ></v-select>
        <v-select
          v-model="privacyData.online"
          :items="WAPrivacyOnlineValue"
          :label="$t('privacy.online')"
          :rules="[
            (v) => !!v || $t('required', { field: $t('privacy.online') }),
          ]"
          density="comfortable"
          prepend-inner-icon="mdi-cellphone"
        ></v-select>
        <v-select
          v-model="privacyData.profile"
          :items="WAPrivacyValue"
          :label="$t('privacy.profilePhoto')"
          :rules="[
            (v) => !!v || $t('required', { field: $t('privacy.profilePhoto') }),
          ]"
          density="comfortable"
          prepend-inner-icon="mdi-account-box"
        ></v-select>
        <v-select
          v-model="privacyData.status"
          :items="WAPrivacyValue"
          :label="$t('privacy.status')"
          :rules="[
            (v) => !!v || $t('required', { field: $t('privacy.status') }),
          ]"
          density="comfortable"
          prepend-inner-icon="mdi-text-short"
        ></v-select>
        <v-select
          v-model="privacyData.readreceipts"
          :items="WAReadReceiptsValue"
          :label="$t('privacy.readreceipts')"
          :rules="[
            (v) => !!v || $t('required', { field: $t('privacy.readreceipts') }),
          ]"
          density="comfortable"
          prepend-inner-icon="mdi-check-all"
        ></v-select>
        <v-select
          v-model="privacyData.groupadd"
          :items="WAPrivacyValue"
          :label="$t('privacy.groupadd')"
          :rules="[
            (v) => !!v || $t('required', { field: $t('privacy.groupadd') }),
          ]"
          density="comfortable"
          prepend-inner-icon="mdi-account-multiple-plus"
        ></v-select>
        <!-- <v-select
          v-model="privacyData.calladd"
          :items="WAPrivacyValue"
          label="Ser adicionado em chamadas"
          color="primary"
          :rules="[(v) => !!v || 'Ser adicionado em chamadas é obrigatório']"
          density="comfortable"
          prepend-inner-icon="mdi-phone-plus"
        ></v-select> -->
      </v-form>
    </v-card-text>
    <v-card-actions v-if="expanded" class="d-flex flex-wrap gap-x-1">
      <v-spacer></v-spacer>
      <v-btn
        :disabled="
          !valid ||
          JSON.stringify(privacyData) === JSON.stringify(defaultPrivacyData)
        "
        :loading="loading"
        color="primary"
        @click="savePrivacy"
        variant="tonal"
      >
        {{ $t("save") }}
      </v-btn>
    </v-card-actions>
  </v-card>
</template>

<script>
import instanceController from "@/services/instanceController";
import { useAppStore } from "@/store/app";

const defaultObj = () => ({
  enabled: false,
  url: "",
  account_id: "",
  token: "",
  sign_msg: true,
  reopen_conversation: true,
  conversation_pending: false,
});

export default {
  name: "ProfilePrivacy",
  props: {
    instance: {
      type: Object,
      required: true,
    },
  },
  data() {
    return {
      AppStore: useAppStore(),
      expanded: false,
      loading: false,
      error: false,
      valid: false,
      WAPrivacyValue: [
        { value: "all", title: this.$t("privacy.options.all") },
        { value: "contacts", title: this.$t("privacy.options.contacts") },
        {
          value: "contact_blacklist",
          title: this.$t("privacy.options.contactBlacklist"),
        },
        { value: "none", title: this.$t("privacy.options.none") },
      ],
      WAPrivacyOnlineValue: [
        { value: "all", title: this.$t("privacy.options.all") },
        {
          value: "match_last_seen",
          title: this.$t("privacy.options.matchLastSeen"),
        },
      ],
      WAReadReceiptsValue: [
        { value: "all", title: this.$t("privacy.options.all") },
        { value: "none", title: this.$t("privacy.options.none") },
      ],

      privacyData: {
        readreceipts: "all",
        profile: "all",
        status: "all",
        online: "all",
        last: "all",
        groupadd: "all",
        calladd: "all",
      },
      defaultChatwootData: {
        readreceipts: "all",
        profile: "all",
        status: "all",
        online: "all",
        last: "all",
        groupadd: "all",
        calladd: "all",
      },
    };
  },
  methods: {
    toggleExpanded() {
      if (this.loading) return;
      this.expanded = !this.expanded;
    },
    chatwootConfig() {
      this.$refs.chatwootConfig.open();
    },
    async savePrivacy() {
      try {
        this.loading = true;
        this.error = false;
        await instanceController.profile.updatePrivacy(
          this.instance.instance.instanceName,
          this.privacyData
        );
        this.defaultPrivacyData = Object.assign({}, this.privacyData);
      } catch (e) {
        this.error = e.message?.message || e.message || e;
      } finally {
        this.loading = false;
      }
    },
    async loadPrivacy() {
      try {
        if (!this.isOpen) return;
        this.loading = true;
        this.error = false;
        const privacyData = await instanceController.profile.getPrivacy(
          this.instance.instance.instanceName
        );
        this.privacyData = Object.assign(defaultObj(), privacyData || {});
        this.defaultPrivacyData = Object.assign(
          defaultObj(),
          privacyData || {}
        );
      } catch (e) {
        this.error = e.message?.message || e.message || e;
      } finally {
        this.loading = false;
      }
    },
  },
  computed: {
    isOpen() {
      return this.instance.instance.status === "open";
    },
  },
  watch: {
    expanded(expanded) {
      if (expanded) this.loadPrivacy();
    },
  },
};
</script>

<style></style>
