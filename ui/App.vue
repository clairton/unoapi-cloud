<template>
  <router-view />
</template>

<script setup>
//
</script>

<style lang="scss">
@for $i from 0 through 8 {
  .gap-x-#{$i} {
    column-gap: #{$i * 0.25}rem;
  }
  .gap-y-#{$i} {
    row-gap: #{$i * 0.25}rem;
  }

  .gap-#{$i} {
    gap: #{$i * 0.25}rem;
  }
}
</style>
