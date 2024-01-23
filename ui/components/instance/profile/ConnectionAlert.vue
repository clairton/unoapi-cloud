<template>
  <v-alert v-if="instance.instance.status != 'open'" type="error" class="mb-0">
    Não é possível alterar o perfil de uma instância desconectada.
  </v-alert>
</template>

<script>

export default {
  name: "ConnectionAlert",
  props: {
    instance: {
      type: Object,
      required: true,
    },
  },
  data: () => ({}),

  methods: {},

  watch: {},
};
</script>

<style></style>
