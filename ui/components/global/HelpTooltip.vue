<template>
  <v-tooltip :text="text" style="display: inline-block" :location="location">
    <template v-slot:activator="{ props }">
      <v-btn v-bind="props" icon :size="size" variant="text">
        <v-icon>mdi-help-circle-outline</v-icon>
      </v-btn>
    </template>
    <slot></slot>
  </v-tooltip>
</template>

<script>
export default {
  name: "HelpTooltip",
  props: {
    text: {
      type: String,
    },
    size: {
      type: String,
      default: "small",
    },
    location: {
      type: String,
      default: "top",
      validator: (value) => {
        return ["top", "end", "bottom", "start"].includes(value);
      },
    },
  },
};
</script>
