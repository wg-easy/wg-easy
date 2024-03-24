<template>
  <div class="h-10 w-10 mr-5 rounded-full bg-gray-50 relative">
    <IconAvatarDefault class="w-6 m-2 text-gray-300" />
    <img v-if="props.client.avatar" :src="props.client.avatar" class="w-10 rounded-full absolute top-0 left-0" />

    <div
      v-if="props.client.latestHandshakeAt && new Date() - new Date(props.client.latestHandshakeAt) < 1000 * 60 * 10"
    >
      <div class="animate-ping w-4 h-4 p-1 bg-red-100 dark:bg-red-100 rounded-full absolute -bottom-1 -right-1"></div>
      <div class="w-2 h-2 bg-red-800 dark:bg-red-600 rounded-full absolute bottom-0 right-0"></div>
    </div>
  </div>
</template>

<script setup>
import { defineProps } from 'vue';
import IconAvatarDefault from './icons/IconAvatarDefault.vue';

const props = defineProps({
  client: {
    type: Object,
    required: true,
  },
});
</script>
