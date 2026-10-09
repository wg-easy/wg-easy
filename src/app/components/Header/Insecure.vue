<template>
  <div
    v-if="!globalStore.information?.insecure && !https"
    class="callout border-accent/30 text-accent"
  >
    <p class="text-center">{{ $t('login.insecure') }}</p>
  </div>
</template>

<script lang="ts" setup>
const globalStore = useGlobalStore();

const https = ref(false);

onMounted(() => {
  if (window.location.protocol === 'https:') {
    https.value = true;
  } else {
    https.value = false;
  }
});
</script>
