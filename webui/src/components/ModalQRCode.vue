<template>
  <div class="bg-black bg-opacity-50 fixed top-0 right-0 left-0 bottom-0 flex items-center justify-center z-20">
    <div class="bg-white rounded-md shadow-lg relative p-8">
      <button
        class="absolute right-4 top-4 text-gray-600 dark:text-neutral-500 hover:text-gray-800 dark:hover:text-neutral-700"
        @click="qrcode = null"
      >
        <IconClose />
      </button>
      <img :src="qrcode" />
    </div>
  </div>
</template>

<script setup>
import { useStore } from '@/store/store';
import { storeToRefs } from 'pinia';

import IconClose from '@/components/icons/IconClose.vue';

const store = useStore();
const { qrcode } = storeToRefs(store);
</script>
