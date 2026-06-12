<template>
  <a
    :href="`/api/auth/${provider}`"
    class="flex items-center justify-center gap-2 rounded border border-gray-300 bg-white py-2 text-sm text-gray-700 shadow-sm transition hover:bg-gray-50 dark:border-neutral-600 dark:bg-neutral-800 dark:text-neutral-200 dark:hover:bg-neutral-700"
  >
    <IconsBrandsProvider :provider="provider" class="h-4 w-4" />
    <span>
      {{ $t('login.signInWith', [info.friendlyName]) }}
    </span>
  </a>
</template>

<script setup lang="ts">
defineProps<{
  info: {
    enabled: boolean;
    friendlyName: string;
  };
  provider: OAUTH_PROVIDER;
}>();
</script>
