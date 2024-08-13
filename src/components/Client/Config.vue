<template>
  <a
    :disabled="!client.downloadableConfig"
    :href="'./api/wireguard/client/' + client.id + '/configuration'"
    :download="client.downloadableConfig ? 'configuration' : null"
    class="align-middle inline-block bg-gray-100 dark:bg-neutral-600 dark:text-neutral-300 p-2 rounded transition"
    :class="{
      'hover:bg-red-800 dark:hover:bg-red-800 hover:text-white dark:hover:text-white':
        client.downloadableConfig,
      'is-disabled': !client.downloadableConfig,
    }"
    :title="!client.downloadableConfig ? $t('noPrivKey') : $t('downloadConfig')"
    @click="
      if (!client.downloadableConfig) {
        $event.preventDefault();
      }
    "
  >
    <svg
      class="w-5"
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
    >
      <path
        stroke-linecap="round"
        stroke-linejoin="round"
        stroke-width="2"
        d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
      />
    </svg>
  </a>
</template>

<script setup lang="ts">
defineProps<{
  client: LocalClient;
}>();
</script>
