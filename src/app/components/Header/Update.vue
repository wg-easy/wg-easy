<template>
  <div
    v-if="
      globalStore.information?.updateAvailable &&
      authStore.userData &&
      hasPermissions(authStore.userData, 'admin', 'any')
    "
    class="callout mb-2 items-center border-accent/25"
    :title="`${globalStore.information.currentRelease} → ${globalStore.information.latestRelease.version}`"
  >
    <IconsSparkles class="size-5 shrink-0 text-accent" />
    <div class="min-w-0 flex-1">
      <p class="font-semibold text-foreground">
        {{ $t('update.updateAvailable') }}
      </p>
      <p class="mt-1 text-xs leading-relaxed">
        {{ globalStore.information.latestRelease.changelog }}
      </p>
    </div>
    <a
      :href="`https://github.com/wg-easy/wg-easy/releases/tag/${globalStore.information.latestRelease.version}`"
      target="_blank"
      rel="noreferrer"
      class="ui-button ui-button-secondary"
      >{{ $t('update.update') }} ↗</a
    >
  </div>
</template>

<script lang="ts" setup>
const globalStore = useGlobalStore();
const authStore = useAuthStore();
</script>
