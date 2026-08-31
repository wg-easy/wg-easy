<template>
  <label
    v-if="selectionMode"
    class="relative mt-2 flex h-10 w-10 cursor-pointer items-center justify-center self-start rounded-full bg-gray-50 text-red-800"
  >
    <input
      :checked="selected"
      type="checkbox"
      class="h-5 w-5 accent-red-800"
      :aria-label="$t('client.selectClient', [client.name])"
      @change="$emit('toggle-selection')"
    />
  </label>
  <div
    v-else
    class="relative mt-2 h-10 w-10 self-start rounded-full bg-gray-50"
  >
    <BaseAvatar :img="client.avatar" class="h-10 w-10">
      <IconsAvatar class="h-6 w-6 text-gray-300" />
    </BaseAvatar>

    <div
      v-if="
        isPeerConnected({
          latestHandshakeAt: client.latestHandshakeAt
            ? new Date(client.latestHandshakeAt)
            : null,
        })
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
defineProps<{
  client: LocalClient;
  selected?: boolean;
  selectionMode?: boolean;
}>();

defineEmits<{
  'toggle-selection': [];
}>();
</script>
