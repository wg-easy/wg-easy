<template>
  <div
    v-if="!globalStore.information?.insecure && !https"
    class="container mx-auto w-fit rounded-md bg-red-800 p-4 text-white shadow-lg dark:bg-red-100 dark:text-red-600"
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
