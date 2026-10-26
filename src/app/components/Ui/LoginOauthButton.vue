<template>
  <a
    :href="`/api/auth/${provider}`"
    class="ui-button ui-button-secondary w-full"
  >
    <IconsBrandsProvider :provider="provider" class="h-4 w-4" />
    <span>
      {{ $t('login.signInWith', { provider: info.friendlyName }) }}
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
