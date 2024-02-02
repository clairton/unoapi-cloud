<template>
  <v-card variant="outlined" :loading="loading">
    <v-card-title
      class="d-flex align-center"
      @click="openModal"
      style="cursor: pointer"
      v-ripple
    >
      <v-icon start>mdi-message-text</v-icon>
      {{ $t("sendMessage.title") }}
      <v-spacer></v-spacer>
      <v-btn
        size="small"
        icon
        :disabled="loading"
        variant="tonal"
        @click.stop="openModal"
        :style="{ transform: expanded ? 'rotate(180deg)' : '' }"
      >
        <v-icon>mdi-open-in-new</v-icon>
      </v-btn>
    </v-card-title>
  </v-card>
  <SendMessage :instance="instance" />
</template>

<script>
import SendMessage from "@/components/modal/SendMessage.vue";

export default {
  name: "MyGroups",
  props: {
    instance: {
      type: Object,
      required: true,
    },
  },
  data: () => ({
    expanded: false,
    loading: false,
    error: false,
  }),
  methods: {
    openModal() {
      // emit event send-message
      window.dispatchEvent(
        new CustomEvent("send-message", {
          detail: {},
        })
      );
    },
  },
  components: { SendMessage },
};
</script>

<style></style>
