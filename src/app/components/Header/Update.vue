<template>
  <div
    v-if="
      globalStore.information?.updateAvailable &&
      authStore.userData &&
      hasPermissions(authStore.userData, 'admin', 'any')
    "
    class="font-small mb-10 rounded-md bg-red-800 p-4 text-sm text-white shadow-lg dark:bg-red-100 dark:text-red-600"
    :title="`v${globalStore.information.currentRelease} → v${globalStore.information.latestRelease.version}`"
  >
    <div class="container mx-auto flex flex-auto flex-row items-center">
      <div class="flex-grow">
        <p class="font-bold">{{ $t('update.updateAvailable') }}</p>
        <p>{{ globalStore.information.latestRelease.changelog }}</p>
      </div>

      <a
        :href="`https://github.com/wg-easy/wg-easy/releases/tag/${globalStore.information.latestRelease.version}`"
        target="_blank"
        class="font-sm float-right flex-shrink-0 rounded-md border-2 border-red-800 bg-white p-3 font-semibold text-red-800 transition-all hover:border-white hover:bg-red-800 hover:text-white dark:border-red-600 dark:bg-red-100 dark:text-red-600 dark:hover:border-red-600 dark:hover:bg-red-600 dark:hover:text-red-100"
      >
        {{ $t('update.update') }} →
      </a>
    </div>
  </div>
</template>

<script lang="ts" setup>
const globalStore = useGlobalStore();
const authStore = useAuthStore();
</script>
