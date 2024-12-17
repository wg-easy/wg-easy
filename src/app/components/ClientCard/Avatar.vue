<template>
  <div class="relative mt-2 h-10 w-10 self-start rounded-full bg-gray-50">
    <BaseAvatar :img="client.avatar" class="h-10 w-10">
      <IconsAvatar class="h-6 w-6 text-gray-300" />
    </BaseAvatar>

    <div
      v-if="
        client.latestHandshakeAt &&
        new Date().getTime() - new Date(client.latestHandshakeAt).getTime() <
          1000 * 60 * 10
      "
    >
      <div
        class="absolute -bottom-1 -right-1 h-4 w-4 animate-ping rounded-full bg-red-100 p-1 dark:bg-red-100"
      />
      <div
        class="absolute bottom-0 right-0 h-2 w-2 rounded-full bg-red-800 dark:bg-red-600"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
const props = defineProps<{
  client: LocalClient;
}>();

console.log(props.client.avatar);
</script>
