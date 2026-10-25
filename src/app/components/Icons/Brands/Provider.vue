<template>
  <IconsBrandsGitHub v-if="provider === 'github'" />
  <IconsBrandsGoogle v-else-if="provider === 'google'" />
</template>

<script setup lang="ts">
defineProps<{
  provider: OAUTH_PROVIDER;
}>();
</script>
