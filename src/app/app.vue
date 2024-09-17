<template>
  <NuxtLayout>
    <NuxtLayout name="header" />
    <ToastProvider>
      <NuxtPage />
      <ToastViewport
        class="[--viewport-padding:_25px] fixed bottom-0 right-0 flex flex-col p-[var(--viewport-padding)] gap-[10px] w-[390px] max-w-[100vw] m-0 list-none z-[2147483647] outline-none"
      />
    </ToastProvider>
    <NuxtLayout name="footer" />
  </NuxtLayout>
</template>

<script setup lang="ts">
const globalStore = useGlobalStore();
globalStore.fetchFeatures();
globalStore.fetchRelease();
globalStore.setLanguage();
globalStore.fetchStatistics();
useHead({
  bodyAttrs: {
    class: 'bg-gray-50 dark:bg-neutral-800',
  },
  link: [
    {
      rel: 'manifest',
      href: '/manifest.json',
    },
    {
      rel: 'icon',
      type: 'image/png',
      href: '/favicon.png',
    },
    {
      rel: 'apple-touch-icon',
      href: '/apple-touch-icon.png',
    },
  ],
  meta: [
    {
      name: 'mobile-web-app-capable',
      content: 'yes',
    },
    {
      name: 'apple-mobile-web-app-capable',
      content: 'yes',
    },
    {
      name: 'apple-mobile-web-app-status-bar-style',
      content: 'black-translucent',
    },
  ],
  title: 'WireGuard',
});
</script>
