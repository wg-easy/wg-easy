<template>
  <div
    v-if="latestRelease"
    class="bg-red-800 dark:bg-red-100 p-4 text-white dark:text-red-600 text-sm font-small mb-10 rounded-md shadow-lg"
    :title="`v${currentRelease} → v${latestRelease.version}`"
  >
    <div class="container mx-auto flex flex-row flex-auto items-center">
      <div class="flex-grow">
        <p class="font-bold">{{ $t('updateAvailable') }}</p>
        <p>{{ latestRelease.changelog }}</p>
      </div>

      <a
        href="https://github.com/wg-easy/wg-easy#updating"
        target="_blank"
        class="p-3 rounded-md bg-white dark:bg-red-100 float-right font-sm font-semibold text-red-800 dark:text-red-600 flex-shrink-0 border-2 border-red-800 dark:border-red-600 hover:border-white dark:hover:border-red-600 hover:text-white dark:hover:text-red-100 hover:bg-red-800 dark:hover:bg-red-600 transition-all"
      >
        {{ $t('update') }} →
      </a>
    </div>
  </div>
</template>

<script setup>
import { defineProps } from 'vue';

defineProps({
  latestRelease: {
    type: Object,
    required: true,
  },
  currentRelease: {
    type: String,
    required: true,
  },
});
</script>
