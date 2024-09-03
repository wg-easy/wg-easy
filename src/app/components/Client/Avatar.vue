<template>
  <div class="h-10 w-10 mt-2 self-start rounded-full bg-gray-50 relative">
    <IconsAvatar class="w-6 m-2 text-gray-300" />
    <img
      v-if="client.avatar"
      :src="client.avatar"
      class="w-10 rounded-full absolute top-0 left-0"
    />

    <div
      v-if="
        client.latestHandshakeAt &&
        new Date().getTime() - new Date(client.latestHandshakeAt).getTime() <
          1000 * 60 * 10
      "
    >
      <div
        class="animate-ping w-4 h-4 p-1 bg-red-100 dark:bg-red-100 rounded-full absolute -bottom-1 -right-1"
      />
      <div
        class="w-2 h-2 bg-red-800 dark:bg-red-600 rounded-full absolute bottom-0 right-0"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  client: LocalClient;
}>();
</script>
