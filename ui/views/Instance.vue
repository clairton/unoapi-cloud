<template>
  <v-alert v-if="error" type="error">
    {{ error }}
  </v-alert>
  <div v-else-if="instance" class="d-flex flex-column" style="gap: 1.5rem">
    <InstanceHeader :instance="instance" />
    <ConnectPhone :instance="instance" />

    <InstanceBody :instance="instance" />

    <InstanceApiKey :instance="instance" ref="apiKeyModal" />
  </div>
</template>

<script>
import { useAppStore } from "@/store/app";
import InstanceApiKey from "@/components/modal/InstanceApiKey.vue";
import ConnectPhone from "@/components/modal/ConnectPhone.vue";
import InstanceHeader from "@/components/instance/InstanceHeader.vue";
import InstanceBody from "@/components/instance/InstanceBody.vue";

export default {
  name: "HomeInstance",
  data: () => ({
    AppStore: useAppStore(),
    loading: true,
    error: false,
  }),
  methods: {
    async loadInstance() {
      try {
        this.loading = true;
        this.error = false;
        await this.AppStore.loadInstance(this.$route.params.id);
      } catch (e) {
        this.error = e.message?.message || e.message || e;
      } finally {
        this.loading = false;
      }
    },
  },
  watch: {
    instance(val, oldVal) {
      if (!val && oldVal) this.$router.push("/");
    },
  },
  computed: {
    instance() {
      return this.AppStore.getInstance(this.$route.params.id);
    },
  },

  async mounted() {
    if (this.AppStore.validConnection) this.loadInstance();
    else this.$router.push({ name: "instances" });
  },
  components: { InstanceApiKey, ConnectPhone, InstanceHeader, InstanceBody },
};
</script>
