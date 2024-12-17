<template>
  <div v-if="modalStore.qrcode">
    <div
      class="fixed bottom-0 left-0 right-0 top-0 z-20 flex items-center justify-center bg-black bg-opacity-50"
    >
      <div class="relative rounded-md bg-white p-8 shadow-lg">
        <button
          class="absolute right-4 top-4 text-gray-600 hover:text-gray-800 dark:text-neutral-500 dark:hover:text-neutral-700"
          @click="modalStore.qrcode = null"
        >
          <IconsClose class="w-8" />
        </button>
        <img :src="modalStore.qrcode" />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
const modalStore = useModalStore();
</script>
