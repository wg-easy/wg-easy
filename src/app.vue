<template>
  <NuxtLayout>
    <NuxtLayout name="header" />
    <main>
      <NuxtPage />
    </main>
    <NuxtLayout name="footer" />
  </NuxtLayout>
</template>

<script setup lang="ts">
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
